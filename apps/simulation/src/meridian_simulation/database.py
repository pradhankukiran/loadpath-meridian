from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import Column, DateTime, Integer, MetaData, String, Table, Text, create_engine, select
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from meridian_simulation.config import Settings
from meridian_simulation.results import LATEST_RESULTS, RECENT_SIMULATION_JOBS

metadata = MetaData()

simulation_jobs = Table(
    "simulation_jobs",
    metadata,
    Column("id", String(40), primary_key=True),
    Column("project_id", String(120), nullable=False, index=True),
    Column("scenario_id", String(120), nullable=False, index=True),
    Column("engine", String(40), nullable=False),
    Column("model", String(160), nullable=False),
    Column("status", String(40), nullable=False, index=True),
    Column("progress", Integer, nullable=False, default=0),
    Column("submitted_at", DateTime(timezone=True), nullable=False),
    Column("started_at", DateTime(timezone=True), nullable=True),
    Column("completed_at", DateTime(timezone=True), nullable=True),
    Column("objective", Text, nullable=False),
    Column("assumptions_json", Text, nullable=False),
    Column("payload_json", Text, nullable=False),
    Column("result_json", Text, nullable=True),
    Column("error_message", Text, nullable=True),
)

_engines: dict[str, Engine] = {}


def initialize_database(settings: Settings) -> None:
    engine = database_engine(settings.database_url)
    metadata.create_all(engine)
    seed_reference_data(engine)


def database_status(settings: Settings) -> str:
    try:
        engine = database_engine(settings.database_url)
        with engine.connect() as connection:
            connection.execute(select(1))
    except SQLAlchemyError:
        return "unavailable"

    return "ok"


def database_engine(database_url: str) -> Engine:
    if database_url not in _engines:
        if database_url.startswith("sqlite:///"):
            path = database_url.removeprefix("sqlite:///")
            if path and path != ":memory:":
                Path(path).parent.mkdir(parents=True, exist_ok=True)

        _engines[database_url] = create_engine(database_url, pool_pre_ping=True)

    return _engines[database_url]


def create_job_record(settings: Settings, job: dict, payload: dict) -> dict:
    engine = database_engine(settings.database_url)
    with engine.begin() as connection:
        connection.execute(
            simulation_jobs.insert().values(
                id=job["id"],
                project_id=job["project_id"],
                scenario_id=job["scenario_id"],
                engine=job["engine"],
                model=job["model"],
                status=job["status"],
                progress=job["progress"],
                submitted_at=parse_datetime(job["submitted_at"]),
                objective=job["objective"],
                assumptions_json=json.dumps(job.get("assumptions", {})),
                payload_json=json.dumps(payload),
                result_json=None,
                error_message=None,
            )
        )

    return job


def list_recent_job_records(settings: Settings, limit: int = 20) -> list[dict]:
    engine = database_engine(settings.database_url)
    with engine.connect() as connection:
        rows = connection.execute(
            select(simulation_jobs)
            .order_by(simulation_jobs.c.submitted_at.desc())
            .limit(limit)
        ).mappings()

        return [job_from_row(row) for row in rows]


def job_status_counts(settings: Settings) -> dict[str, int]:
    engine = database_engine(settings.database_url)
    counts = {
        "queued": 0,
        "running": 0,
        "complete": 0,
        "failed": 0,
    }

    with engine.connect() as connection:
        rows = connection.execute(select(simulation_jobs.c.status)).mappings()

        for row in rows:
            status = row["status"]
            counts[status] = counts.get(status, 0) + 1

    return counts


def get_job_payload(settings: Settings, job_id: str) -> dict | None:
    row = get_job_row(settings, job_id)
    if row is None:
        return None

    return json.loads(row["payload_json"])


def mark_job_running(settings: Settings, job_id: str) -> None:
    update_job(settings, job_id, status="running", progress=35, started_at=datetime.now(UTC))


def mark_job_complete(settings: Settings, job_id: str, result: dict) -> dict:
    update_job(
        settings,
        job_id,
        status="complete",
        progress=100,
        completed_at=datetime.now(UTC),
        result_json=json.dumps(result),
        error_message=None,
    )

    row = get_job_row(settings, job_id)
    return job_from_row(row) if row else {}


def mark_job_failed(settings: Settings, job_id: str, error_message: str) -> dict:
    update_job(
        settings,
        job_id,
        status="failed",
        progress=100,
        completed_at=datetime.now(UTC),
        error_message=error_message,
    )

    row = get_job_row(settings, job_id)
    return job_from_row(row) if row else {}


def latest_result_record(settings: Settings, project_id: str, scenario_id: str) -> dict | None:
    engine = database_engine(settings.database_url)
    with engine.connect() as connection:
        row = connection.execute(
            select(simulation_jobs)
            .where(simulation_jobs.c.project_id == project_id)
            .where(simulation_jobs.c.scenario_id == scenario_id)
            .where(simulation_jobs.c.status == "complete")
            .where(simulation_jobs.c.result_json.is_not(None))
            .order_by(simulation_jobs.c.completed_at.desc())
            .limit(1)
        ).mappings().first()

    if row is None:
        return None

    return json.loads(row["result_json"])


def scenario_result_history_records(
    settings: Settings,
    project_id: str,
    scenario_id: str,
    limit: int = 10,
) -> list[dict]:
    engine = database_engine(settings.database_url)
    with engine.connect() as connection:
        rows = connection.execute(
            select(simulation_jobs)
            .where(simulation_jobs.c.project_id == project_id)
            .where(simulation_jobs.c.scenario_id == scenario_id)
            .where(simulation_jobs.c.status == "complete")
            .where(simulation_jobs.c.result_json.is_not(None))
            .order_by(simulation_jobs.c.completed_at.desc())
            .limit(limit)
        ).mappings()

        return [result_history_from_row(row) for row in rows]


def project_result_records(settings: Settings, project_id: str) -> list[dict]:
    engine = database_engine(settings.database_url)
    with engine.connect() as connection:
        rows = connection.execute(
            select(simulation_jobs)
            .where(simulation_jobs.c.project_id == project_id)
            .where(simulation_jobs.c.status == "complete")
            .where(simulation_jobs.c.result_json.is_not(None))
            .order_by(simulation_jobs.c.completed_at.desc())
        ).mappings()

        latest_by_scenario = {}
        for row in rows:
            if row["scenario_id"] not in latest_by_scenario:
                latest_by_scenario[row["scenario_id"]] = json.loads(row["result_json"])

    return list(latest_by_scenario.values())


def get_job_row(settings: Settings, job_id: str) -> dict | None:
    engine = database_engine(settings.database_url)
    with engine.connect() as connection:
        row = connection.execute(
            select(simulation_jobs).where(simulation_jobs.c.id == job_id)
        ).mappings().first()

    return dict(row) if row else None


def update_job(settings: Settings, job_id: str, **values: Any) -> None:
    engine = database_engine(settings.database_url)
    with engine.begin() as connection:
        connection.execute(
            simulation_jobs.update()
            .where(simulation_jobs.c.id == job_id)
            .values(**values)
        )


def seed_reference_data(engine: Engine) -> None:
    seed_jobs = [
        {
            **RECENT_SIMULATION_JOBS[0],
            "objective": "Evaluate storage-led reinforcement deferral.",
            "assumptions": {"storage_duration_hours": 6, "grid_import_limit_mw": 310},
            "payload": {
                "project_id": "prj_nw_grid",
                "scenario_id": "scn_nw_storage",
                "engine": "pypsa",
                "objective": "Evaluate storage-led reinforcement deferral.",
                "annual_demand_mwh": 1840000,
                "peak_load_mw": 482,
                "renewable_share_target": 75,
                "assumptions": {"storage_duration_hours": 6, "grid_import_limit_mw": 310},
            },
            "result": None,
        },
        {
            **RECENT_SIMULATION_JOBS[1],
            "objective": "Estimate hybrid plant output and storage utilisation.",
            "assumptions": {"solar_capacity_mw": 220, "battery_capacity_mwh": 480},
            "payload": {
                "project_id": "prj_solar_storage",
                "scenario_id": "scn_az_hybrid",
                "engine": "pysam",
                "objective": "Estimate hybrid plant output and storage utilisation.",
                "annual_demand_mwh": 620000,
                "peak_load_mw": 155,
                "renewable_share_target": 82,
                "assumptions": {"solar_capacity_mw": 220, "battery_capacity_mwh": 480},
            },
            "result": LATEST_RESULTS[("prj_solar_storage", "scn_az_hybrid")],
        },
        {
            **RECENT_SIMULATION_JOBS[2],
            "objective": "Quantify grid impacts from electrified heat growth.",
            "assumptions": {"grid_voltage_kv": 33},
            "payload": {
                "project_id": "prj_heat_network",
                "scenario_id": "scn_heat_peak",
                "engine": "pandapower",
                "objective": "Quantify grid impacts from electrified heat growth.",
                "annual_demand_mwh": 910000,
                "peak_load_mw": 238,
                "renewable_share_target": 55,
                "assumptions": {"grid_voltage_kv": 33},
            },
            "result": None,
        },
        {
            "id": "sim_seed_nw_base",
            "project_id": "prj_nw_grid",
            "scenario_id": "scn_nw_base",
            "engine": "pypsa",
            "model": "PyPSA energy-system optimisation",
            "status": "complete",
            "progress": 100,
            "submitted_at": "2026-06-04T07:20:00Z",
            "objective": "Minimise system cost while meeting forecast demand.",
            "assumptions": {"storage_duration_hours": 4, "grid_import_limit_mw": 350},
            "payload": {
                "project_id": "prj_nw_grid",
                "scenario_id": "scn_nw_base",
                "engine": "pypsa",
                "objective": "Minimise system cost while meeting forecast demand.",
                "annual_demand_mwh": 1840000,
                "peak_load_mw": 482,
                "renewable_share_target": 68,
                "assumptions": {"storage_duration_hours": 4, "grid_import_limit_mw": 350},
            },
            "result": LATEST_RESULTS[("prj_nw_grid", "scn_nw_base")],
        },
    ]

    with engine.begin() as connection:
        for job in seed_jobs:
            exists = connection.execute(
                select(simulation_jobs.c.id).where(simulation_jobs.c.id == job["id"])
            ).first()

            if exists:
                continue

            submitted_at = parse_datetime(job["submitted_at"])
            completed_at = submitted_at if job["status"] == "complete" else None
            started_at = submitted_at if job["status"] in {"running", "complete"} else None

            connection.execute(
                simulation_jobs.insert().values(
                    id=job["id"],
                    project_id=job["project_id"],
                    scenario_id=job["scenario_id"],
                    engine=job["engine"],
                    model=job["model"],
                    status=job["status"],
                    progress=job["progress"],
                    submitted_at=submitted_at,
                    started_at=started_at,
                    completed_at=completed_at,
                    objective=job["objective"],
                    assumptions_json=json.dumps(job.get("assumptions", {})),
                    payload_json=json.dumps(job["payload"]),
                    result_json=json.dumps(job["result"]) if job["result"] else None,
                    error_message=None,
                )
            )


def job_from_row(row: dict) -> dict:
    job = {
        "id": row["id"],
        "project_id": row["project_id"],
        "scenario_id": row["scenario_id"],
        "engine": row["engine"],
        "model": row["model"],
        "status": row["status"],
        "progress": row["progress"],
        "submitted_at": format_datetime(row["submitted_at"]),
        "objective": row["objective"],
        "assumptions": json.loads(row["assumptions_json"] or "{}"),
        "links": {
            "latest_result": (
                f"/api/projects/{row['project_id']}/scenarios/"
                f"{row['scenario_id']}/results/latest"
            ),
        },
    }

    if row.get("started_at"):
        job["started_at"] = format_datetime(row["started_at"])

    if row.get("completed_at"):
        job["completed_at"] = format_datetime(row["completed_at"])

    if row.get("error_message"):
        job["error_message"] = row["error_message"]

    return job


def result_history_from_row(row: dict) -> dict:
    result = json.loads(row["result_json"] or "{}")
    engine_adapter = result.get("engine_adapter") or {}

    return {
        "job_id": row["id"],
        "project_id": row["project_id"],
        "scenario_id": row["scenario_id"],
        "engine": row["engine"],
        "model": row["model"],
        "status": row["status"],
        "submitted_at": format_datetime(row["submitted_at"]),
        "completed_at": format_datetime(row["completed_at"]),
        "total_cost_million": result.get("total_cost_million"),
        "renewable_share_percent": result.get("renewable_share_percent"),
        "emissions_tonnes_co2e": result.get("emissions_tonnes_co2e"),
        "curtailment_mwh": result.get("curtailment_mwh"),
        "reliability_margin_percent": result.get("reliability_margin_percent"),
        "engine_adapter_status": engine_adapter.get("status"),
        "solver": engine_adapter.get("solver"),
        "artifact_count": result_artifact_count(engine_adapter),
    }


def result_artifact_count(engine_adapter: dict) -> int:
    model = engine_adapter.get("model") or {}
    artifacts = model.get("artifacts")
    return len(artifacts) if isinstance(artifacts, list) else 0


def parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def format_datetime(value: datetime | str) -> str:
    if isinstance(value, str):
        return value

    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)

    return value.astimezone(UTC).isoformat()
