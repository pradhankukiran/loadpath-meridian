from __future__ import annotations

import csv
import json
from datetime import UTC, datetime
from io import BytesIO, StringIO
from zipfile import ZIP_DEFLATED, ZipFile

from meridian_simulation.comparison import compare_project_scenarios
from meridian_simulation.config import Settings
from meridian_simulation.job_store import project_results


def build_report_package(project_id: str, settings: Settings | None = None) -> tuple[bytes, str]:
    settings = settings or Settings.from_env()
    generated_at = datetime.now(UTC).isoformat()
    comparison = compare_project_scenarios(project_id, settings)
    results = project_results(project_id, settings)
    package_name = f"loadpath-meridian-{safe_slug(project_id)}-report-package.zip"

    manifest = {
        "package": "loadpath_meridian_report_package",
        "project_id": project_id,
        "generated_at": generated_at,
        "scenario_count": comparison["scenario_count"],
        "files": [
            "manifest.json",
            "comparison.json",
            "comparison.csv",
            "executive-summary.md",
            "scenarios/",
        ],
    }

    buffer = BytesIO()
    with ZipFile(buffer, "w", ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", json.dumps(manifest, indent=2))
        archive.writestr("comparison.json", json.dumps(comparison, indent=2))
        archive.writestr("comparison.csv", comparison_csv(comparison))
        archive.writestr("executive-summary.md", executive_summary(project_id, comparison, generated_at))

        for result in results:
            scenario_id = result["scenario_id"]
            archive.writestr(
                f"scenarios/{safe_slug(scenario_id)}.json",
                json.dumps(result, indent=2),
            )

    buffer.seek(0)
    return buffer.read(), package_name


def comparison_csv(comparison: dict) -> str:
    output = StringIO()
    fieldnames = [
        "scenario_id",
        "engine",
        "total_cost_million",
        "renewable_share_percent",
        "emissions_tonnes_co2e",
        "curtailment_mwh",
        "reliability_margin_percent",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for scenario in comparison["scenarios"]:
        writer.writerow({field: scenario[field] for field in fieldnames})

    return output.getvalue()


def executive_summary(project_id: str, comparison: dict, generated_at: str) -> str:
    lines = [
        f"# Loadpath Meridian Report Package: {project_id}",
        "",
        f"Generated at: {generated_at}",
        f"Completed scenarios: {comparison['scenario_count']}",
        "",
        "## Decision Summary",
        "",
        comparison["indicators"]["summary"],
        "",
        "## Indicators",
        "",
        f"- Best value: {comparison['indicators']['best_value_scenario_id'] or '-'}",
        f"- Lowest emissions: {comparison['indicators']['lowest_emissions_scenario_id'] or '-'}",
        f"- Highest renewable share: {comparison['indicators']['highest_renewable_scenario_id'] or '-'}",
        f"- Highest risk: {comparison['indicators']['highest_risk_scenario_id'] or '-'}",
        "",
        "## Scenario Metrics",
        "",
        "| Scenario | Engine | Cost GBPm | Renewables % | Emissions tCO2e | Curtailment MWh | Reliability % |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ]

    for scenario in comparison["scenarios"]:
        lines.append(
            "| {scenario_id} | {engine} | {cost} | {renewables} | {emissions} | {curtailment} | {reliability} |".format(
                scenario_id=scenario["scenario_id"],
                engine=scenario["engine"],
                cost=scenario["total_cost_million"],
                renewables=scenario["renewable_share_percent"],
                emissions=scenario["emissions_tonnes_co2e"],
                curtailment=scenario["curtailment_mwh"],
                reliability=scenario["reliability_margin_percent"],
            )
        )

    lines.append("")
    return "\n".join(lines)


def safe_slug(value: str) -> str:
    return "".join(character if character.isalnum() or character in {"-", "_"} else "-" for character in value)
