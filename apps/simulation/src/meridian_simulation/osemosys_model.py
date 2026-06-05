from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def run_osemosys_capacity_expansion(payload: dict, baseline_result: dict, pyomo: Any) -> dict:
    data = build_osemosys_data(payload)
    model = build_pyomo_model(data, pyomo)
    solver_name = str(payload.get("assumptions", {}).get("solver_name", "appsi_highs"))
    solver = pyomo.SolverFactory(solver_name)

    if not solver.available(False):
        raise RuntimeError(f"{solver_name} solver is not available")

    result = solver.solve(model)
    termination = str(result.solver.termination_condition)
    if termination.lower() != "optimal":
        raise RuntimeError(f"OSeMOSYS capacity expansion did not solve optimally: {termination}")

    solution = solution_from_model(model, data, pyomo, solver_name, termination)
    artifacts = write_osemosys_artifacts(payload, data, model, solution, pyomo)

    return {
        "solution": solution,
        "artifacts": artifacts,
        "updates": normalized_result_updates(baseline_result, solution),
    }


def build_osemosys_data(payload: dict) -> dict:
    assumptions = payload.get("assumptions", {})
    annual_demand_mwh = float(payload.get("annual_demand_mwh", 1_000_000))
    renewable_target = float(payload.get("renewable_share_target", 70)) / 100
    carbon_price = float(assumptions.get("carbon_price_gbp_per_tonne", 85))

    technologies = {
        "solar": {
            "label": "Solar",
            "capex_per_mw": float(assumptions.get("solar_capex_gbp_per_mw", 650_000)),
            "variable_cost_per_mwh": float(assumptions.get("solar_variable_cost_gbp_per_mwh", 5)),
            "capacity_factor": float(assumptions.get("solar_capacity_factor", 0.18)),
            "emissions_tonnes_per_mwh": 0,
            "renewable": True,
        },
        "wind": {
            "label": "Wind",
            "capex_per_mw": float(assumptions.get("wind_capex_gbp_per_mw", 1_250_000)),
            "variable_cost_per_mwh": float(assumptions.get("wind_variable_cost_gbp_per_mwh", 8)),
            "capacity_factor": float(assumptions.get("wind_capacity_factor", 0.34)),
            "emissions_tonnes_per_mwh": 0,
            "renewable": True,
        },
        "gas": {
            "label": "Grid imports",
            "capex_per_mw": float(assumptions.get("firm_capacity_capex_gbp_per_mw", 450_000)),
            "variable_cost_per_mwh": float(assumptions.get("grid_import_cost_gbp_per_mwh", 96)),
            "capacity_factor": float(assumptions.get("firm_capacity_factor", 0.9)),
            "emissions_tonnes_per_mwh": float(assumptions.get("grid_emissions_tonnes_per_mwh", 0.29)),
            "renewable": False,
        },
    }

    return {
        "model": "Loadpath Meridian OSeMOSYS-lite capacity expansion",
        "year": int(assumptions.get("model_year", 2035)),
        "annual_demand_mwh": annual_demand_mwh,
        "renewable_target": renewable_target,
        "carbon_price_gbp_per_tonne": carbon_price,
        "technologies": technologies,
    }


def build_pyomo_model(data: dict, pyomo: Any) -> Any:
    model = pyomo.ConcreteModel(name="loadpath_osemosys_capacity_expansion")
    model.TECHNOLOGIES = pyomo.Set(initialize=list(data["technologies"].keys()))
    model.CapacityMW = pyomo.Var(model.TECHNOLOGIES, domain=pyomo.NonNegativeReals)
    model.GenerationMWh = pyomo.Var(model.TECHNOLOGIES, domain=pyomo.NonNegativeReals)

    def capacity_limit_rule(model, technology):
        tech = data["technologies"][technology]
        return model.GenerationMWh[technology] <= model.CapacityMW[technology] * tech["capacity_factor"] * 8760

    model.CapacityLimit = pyomo.Constraint(model.TECHNOLOGIES, rule=capacity_limit_rule)
    model.DemandBalance = pyomo.Constraint(
        expr=sum(model.GenerationMWh[technology] for technology in model.TECHNOLOGIES)
        >= data["annual_demand_mwh"]
    )
    model.RenewableTarget = pyomo.Constraint(
        expr=sum(
            model.GenerationMWh[technology]
            for technology in model.TECHNOLOGIES
            if data["technologies"][technology]["renewable"]
        )
        >= data["annual_demand_mwh"] * data["renewable_target"]
    )

    model.TotalCost = pyomo.Objective(
        expr=sum(
            model.CapacityMW[technology] * data["technologies"][technology]["capex_per_mw"]
            + model.GenerationMWh[technology]
            * (
                data["technologies"][technology]["variable_cost_per_mwh"]
                + data["technologies"][technology]["emissions_tonnes_per_mwh"]
                * data["carbon_price_gbp_per_tonne"]
            )
            for technology in model.TECHNOLOGIES
        ),
        sense=pyomo.minimize,
    )

    return model


def solution_from_model(
    model: Any,
    data: dict,
    pyomo: Any,
    solver_name: str,
    termination: str,
) -> dict:
    generation = {
        technology: round(pyomo.value(model.GenerationMWh[technology]), 2)
        for technology in model.TECHNOLOGIES
    }
    capacity = {
        technology: round(pyomo.value(model.CapacityMW[technology]), 2)
        for technology in model.TECHNOLOGIES
    }
    emissions = sum(
        generation[technology] * data["technologies"][technology]["emissions_tonnes_per_mwh"]
        for technology in generation
    )
    renewable_generation = sum(
        generation[technology]
        for technology in generation
        if data["technologies"][technology]["renewable"]
    )
    total_cost = pyomo.value(model.TotalCost)

    return {
        "solver": solver_name,
        "termination_condition": termination,
        "objective_gbp": round(total_cost, 2),
        "total_cost_million": round(total_cost / 1_000_000, 2),
        "emissions_tonnes_co2e": round(emissions, 2),
        "renewable_share_percent": round(renewable_generation / data["annual_demand_mwh"] * 100, 2),
        "capacity_mw": capacity,
        "generation_mwh": generation,
    }


def normalized_result_updates(baseline_result: dict, solution: dict) -> dict:
    generation = solution["generation_mwh"]
    capacity = solution["capacity_mw"]
    total_generation = max(sum(generation.values()), 1)

    return {
        "total_cost_million": solution["total_cost_million"],
        "renewable_share_percent": solution["renewable_share_percent"],
        "emissions_tonnes_co2e": round(solution["emissions_tonnes_co2e"]),
        "generation_mix": [
            {"label": "Solar", "mwh": generation["solar"]},
            {"label": "Wind", "mwh": generation["wind"]},
            {
                "label": "Storage discharge",
                "mwh": next(
                    (item["mwh"] for item in baseline_result["generation_mix"] if item["label"] == "Storage discharge"),
                    0,
                ),
            },
            {"label": "Grid imports", "mwh": generation["gas"]},
        ],
        "cost_breakdown": [
            {"label": "Optimised system", "million": solution["total_cost_million"]},
            {"label": "Emissions", "million": round(solution["emissions_tonnes_co2e"] * 0.085, 2)},
            {"label": "Firm capacity", "million": round(capacity["gas"] * 0.45, 2)},
        ],
        "engine_resource_summary": {
            "source": "OSeMOSYS-lite capacity expansion",
            "objective_gbp": solution["objective_gbp"],
            "solar_capacity_mw": capacity["solar"],
            "wind_capacity_mw": capacity["wind"],
            "firm_capacity_mw": capacity["gas"],
            "renewable_generation_mwh": round(generation["solar"] + generation["wind"], 2),
            "firm_generation_mwh": generation["gas"],
            "total_generation_mwh": round(total_generation, 2),
        },
    }


def write_osemosys_artifacts(
    payload: dict,
    data: dict,
    model: Any,
    solution: dict,
    pyomo: Any,
) -> list[dict]:
    artifact_dir = Path(payload.get("artifact_dir", "storage/artifacts"))
    run_dir = artifact_dir / safe_slug(payload["project_id"]) / safe_slug(payload["scenario_id"]) / safe_slug(payload.get("job_id", "local"))
    run_dir.mkdir(parents=True, exist_ok=True)

    data_path = run_dir / "osemosys-data.json"
    solution_path = run_dir / "osemosys-solution.json"
    summary_path = run_dir / "osemosys-model-summary.txt"
    lp_path = run_dir / "osemosys-model.lp"

    data_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    solution_path.write_text(json.dumps(solution, indent=2), encoding="utf-8")
    summary_path.write_text(model_summary(data, solution), encoding="utf-8")
    model.write(str(lp_path), io_options={"symbolic_solver_labels": True})

    return [
        artifact_info("input_data", data_path),
        artifact_info("solution", solution_path),
        artifact_info("model_summary", summary_path),
        artifact_info("linear_program", lp_path),
    ]


def model_summary(data: dict, solution: dict) -> str:
    lines = [
        data["model"],
        f"Generated at: {datetime.now(UTC).isoformat()}",
        f"Model year: {data['year']}",
        f"Annual demand MWh: {data['annual_demand_mwh']}",
        f"Renewable target: {data['renewable_target'] * 100:.1f}%",
        f"Solver: {solution['solver']}",
        f"Termination: {solution['termination_condition']}",
        f"Objective GBP: {solution['objective_gbp']}",
        "",
        "Capacity MW:",
    ]

    lines.extend(f"- {technology}: {value}" for technology, value in solution["capacity_mw"].items())
    lines.append("")
    lines.append("Generation MWh:")
    lines.extend(f"- {technology}: {value}" for technology, value in solution["generation_mwh"].items())

    return "\n".join(lines) + "\n"


def artifact_info(kind: str, path: Path) -> dict:
    return {
        "kind": kind,
        "path": str(path),
        "bytes": path.stat().st_size,
    }


def safe_slug(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_.-]+", "_", value).strip("_") or "artifact"
