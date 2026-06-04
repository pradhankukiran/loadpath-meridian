from __future__ import annotations

from meridian_simulation.config import Settings
from meridian_simulation.job_store import project_results


def compare_project_scenarios(project_id: str, settings: Settings | None = None) -> dict:
    results = project_results(project_id, settings)
    scenarios = [scenario_summary(result) for result in results]

    return {
        "project_id": project_id,
        "scenario_count": len(scenarios),
        "scenarios": scenarios,
        "indicators": comparison_indicators(scenarios),
    }


def scenario_summary(result: dict) -> dict:
    return {
        "scenario_id": result["scenario_id"],
        "engine": result["engine"],
        "total_cost_million": result["total_cost_million"],
        "renewable_share_percent": result["renewable_share_percent"],
        "emissions_tonnes_co2e": result["emissions_tonnes_co2e"],
        "curtailment_mwh": result["curtailment_mwh"],
        "reliability_margin_percent": result["reliability_margin_percent"],
        "generation_mix": result.get("generation_mix", []),
        "cost_breakdown": result.get("cost_breakdown", []),
    }


def comparison_indicators(scenarios: list[dict]) -> dict:
    if not scenarios:
        return {
            "best_value_scenario_id": None,
            "lowest_emissions_scenario_id": None,
            "highest_renewable_scenario_id": None,
            "highest_risk_scenario_id": None,
            "summary": "No completed simulation results are available for comparison.",
        }

    best_value = min(scenarios, key=lambda item: item["total_cost_million"])
    lowest_emissions = min(scenarios, key=lambda item: item["emissions_tonnes_co2e"])
    highest_renewable = max(scenarios, key=lambda item: item["renewable_share_percent"])
    highest_risk = min(scenarios, key=lambda item: item["reliability_margin_percent"])

    return {
        "best_value_scenario_id": best_value["scenario_id"],
        "lowest_emissions_scenario_id": lowest_emissions["scenario_id"],
        "highest_renewable_scenario_id": highest_renewable["scenario_id"],
        "highest_risk_scenario_id": highest_risk["scenario_id"],
        "summary": (
            f"{best_value['scenario_id']} has the lowest total cost, "
            f"{lowest_emissions['scenario_id']} has the lowest emissions, and "
            f"{highest_renewable['scenario_id']} has the highest renewable share."
        ),
    }
