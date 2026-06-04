from __future__ import annotations

from math import cos, pi, sin

from meridian_simulation.engine_adapters import run_engine_adapter


def run_energy_system_simulation(payload: dict) -> dict:
    annual_demand_mwh = float(payload.get("annual_demand_mwh", 1_840_000))
    peak_load_mw = float(payload.get("peak_load_mw", 482))
    renewable_target = float(payload.get("renewable_share_target", 70))
    assumptions = payload.get("assumptions", {})
    engine = payload["engine"]
    input_data_summary = payload.get("input_data_summary")

    dispatch_profile = build_dispatch_profile(
        annual_demand_mwh=annual_demand_mwh,
        peak_load_mw=peak_load_mw,
        renewable_target=renewable_target,
        storage_duration_hours=float(assumptions.get("storage_duration_hours", 4)),
        grid_import_limit_mw=float(assumptions.get("grid_import_limit_mw", peak_load_mw * 0.78)),
    )

    totals = {
        "demand_mwh": round(sum(row["demand_mw"] for row in dispatch_profile), 2),
        "solar_mwh": round(sum(row["solar_mw"] for row in dispatch_profile), 2),
        "wind_mwh": round(sum(row["wind_mw"] for row in dispatch_profile), 2),
        "storage_mwh": round(sum(max(row["storage_mw"], 0) for row in dispatch_profile), 2),
        "grid_mwh": round(sum(row["grid_mw"] for row in dispatch_profile), 2),
        "curtailment_mwh": round(sum(row["curtailment_mw"] for row in dispatch_profile), 2),
    }

    scale = annual_demand_mwh / max(totals["demand_mwh"], 1)
    annualised = {key: round(value * scale, 2) for key, value in totals.items()}

    carbon_price = float(assumptions.get("carbon_price_gbp_per_tonne", 85))
    renewable_share = min(
        99.0,
        ((annualised["solar_mwh"] + annualised["wind_mwh"] + annualised["storage_mwh"] * 0.55)
         / annual_demand_mwh)
        * 100,
    )
    emissions = annualised["grid_mwh"] * 0.29
    generation_cost = (
        annualised["solar_mwh"] * 42
        + annualised["wind_mwh"] * 55
        + annualised["storage_mwh"] * 18
        + annualised["grid_mwh"] * 96
    )
    carbon_cost = emissions * carbon_price
    network_cost = peak_load_mw * 165_000
    total_cost_million = (generation_cost + carbon_cost + network_cost) / 1_000_000

    result = {
        "scenario_id": payload["scenario_id"],
        "status": "complete",
        "engine": engine,
        "total_cost_million": round(total_cost_million, 1),
        "renewable_share_percent": round(renewable_share, 1),
        "emissions_tonnes_co2e": round(emissions),
        "curtailment_mwh": round(annualised["curtailment_mwh"]),
        "reliability_margin_percent": round(max(4.0, 22.0 - peak_load_mw / 42), 1),
        "generation_mix": [
            {"label": "Solar", "mwh": annualised["solar_mwh"]},
            {"label": "Wind", "mwh": annualised["wind_mwh"]},
            {"label": "Storage discharge", "mwh": annualised["storage_mwh"]},
            {"label": "Grid imports", "mwh": annualised["grid_mwh"]},
        ],
        "cost_breakdown": [
            {"label": "Generation", "million": round(generation_cost / 1_000_000, 1)},
            {"label": "Network capacity", "million": round(network_cost / 1_000_000, 1)},
            {"label": "Carbon", "million": round(carbon_cost / 1_000_000, 1)},
        ],
        "input_data_summary": input_data_summary,
        "dispatch_profile": dispatch_profile,
        "recommendations": build_recommendations(
            renewable_share=renewable_share,
            renewable_target=renewable_target,
            curtailment_mwh=annualised["curtailment_mwh"],
            storage_duration_hours=float(assumptions.get("storage_duration_hours", 4)),
        ),
    }

    adapter_outcome = run_engine_adapter(payload, result)
    if adapter_outcome.updates:
        result.update(adapter_outcome.updates)

    result["engine_adapter"] = adapter_outcome.metadata

    return result


def build_dispatch_profile(
    annual_demand_mwh: float,
    peak_load_mw: float,
    renewable_target: float,
    storage_duration_hours: float,
    grid_import_limit_mw: float,
) -> list[dict]:
    average_load = annual_demand_mwh / 8760
    solar_capacity = peak_load_mw * (renewable_target / 100) * 0.72
    wind_capacity = peak_load_mw * (renewable_target / 100) * 0.58
    storage_power = peak_load_mw * min(0.45, storage_duration_hours / 16)

    profile = []

    for hour in range(24):
        daily_shape = 0.76 + 0.18 * sin(((hour - 7) / 24) * 2 * pi) + 0.16 * sin(((hour - 17) / 24) * 2 * pi)
        demand = min(peak_load_mw, max(average_load * 0.7, average_load * daily_shape * 1.28))
        solar_shape = max(0, sin(((hour - 6) / 12) * pi))
        wind_shape = 0.48 + 0.18 * cos((hour / 24) * 2 * pi)
        solar = solar_capacity * solar_shape
        wind = wind_capacity * wind_shape
        net_before_storage = demand - solar - wind
        storage = min(storage_power, max(0, net_before_storage * 0.65)) if hour in range(17, 22) else 0
        grid = min(grid_import_limit_mw, max(0, net_before_storage - storage))
        curtailment = max(0, solar + wind + storage - demand)

        profile.append({
            "hour": hour,
            "demand_mw": round(demand, 2),
            "solar_mw": round(solar, 2),
            "wind_mw": round(wind, 2),
            "storage_mw": round(storage, 2),
            "grid_mw": round(grid, 2),
            "curtailment_mw": round(curtailment, 2),
        })

    return profile


def build_recommendations(
    renewable_share: float,
    renewable_target: float,
    curtailment_mwh: float,
    storage_duration_hours: float,
) -> list[str]:
    recommendations = []

    if renewable_share < renewable_target:
        recommendations.append("Increase renewable capacity or relax the grid import constraint to meet the target.")
    else:
        recommendations.append("Renewable target is met under the current capacity and dispatch assumptions.")

    if curtailment_mwh > 20_000:
        recommendations.append("Curtailment is material; test additional storage duration or flexible demand.")

    if storage_duration_hours < 6:
        recommendations.append("Run a 6-hour storage sensitivity before deciding on network reinforcement.")
    else:
        recommendations.append("Storage duration is high enough to reduce evening peak imports in this profile.")

    return recommendations
