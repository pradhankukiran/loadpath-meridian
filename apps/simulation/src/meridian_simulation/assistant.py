from __future__ import annotations

import requests

from meridian_simulation.data_store import list_datasets
from meridian_simulation.results import LATEST_RESULTS


def analyse_scenario(
    *,
    project_id: str,
    scenario_id: str,
    message: str,
    modal_endpoint: str | None,
    http_post=requests.post,
) -> dict:
    context = build_assistant_context(project_id, scenario_id, message)

    if modal_endpoint:
        try:
            response = http_post(
                modal_endpoint,
                json={
                    "message": message,
                    "context": context,
                    "system": (
                        "You are Loadpath Meridian's energy infrastructure analysis "
                        "assistant. Explain simulation results clearly and call out "
                        "weak assumptions, operational risks, and scenario changes."
                    ),
                },
                timeout=45,
            )
            response.raise_for_status()
            data = response.json()
            text = data.get("analysis") or data.get("text") or data.get("response")

            if text:
                return {
                    "source": "modal",
                    "analysis": text,
                    "context": context,
                }
        except requests.RequestException:
            pass

    return {
        "source": "local",
        "analysis": local_analysis(context),
        "context": context,
    }


def build_assistant_context(project_id: str, scenario_id: str, message: str) -> dict:
    result = LATEST_RESULTS.get((project_id, scenario_id))
    datasets = list_datasets(project_id, scenario_id)

    return {
        "project_id": project_id,
        "scenario_id": scenario_id,
        "message": message,
        "latest_result": result,
        "latest_dataset_summary": datasets[0]["summary"] if datasets else None,
    }


def local_analysis(context: dict) -> str:
    result = context.get("latest_result")
    dataset = context.get("latest_dataset_summary")

    if not result:
        return (
            "No completed simulation result is available for this scenario yet. "
            "Import input data, run a simulation, then ask for interpretation."
        )

    lines = [
        (
            f"The latest {result['engine']} result reaches "
            f"{result['renewable_share_percent']}% renewable share with total cost "
            f"of £{result['total_cost_million']}m."
        ),
        (
            f"Emissions are {result['emissions_tonnes_co2e']:,} tCO2e and "
            f"curtailment is {result['curtailment_mwh']:,} MWh, so storage and "
            "flexible demand are the first areas to test."
        ),
    ]

    if dataset:
        lines.append(
            "The analysis uses imported weather inputs with "
            f"{dataset.get('records', 0)} records, mean wind "
            f"{dataset.get('wind_speed_10m_mean_kmh', 'n/a')} km/h, and mean "
            f"shortwave radiation {dataset.get('shortwave_radiation_mean_wm2', 'n/a')} W/m2."
        )

    recommendations = result.get("recommendations", [])
    if recommendations:
        lines.append(f"Priority recommendation: {recommendations[0]}")

    return " ".join(lines)
