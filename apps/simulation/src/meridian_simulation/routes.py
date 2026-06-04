from flask import Blueprint, current_app, jsonify, request
from pydantic import BaseModel, Field, ValidationError

from meridian_simulation.assistant import analyse_scenario
from meridian_simulation.catalog import DATA_CONNECTORS, SIMULATION_ENGINES
from meridian_simulation.connectors import connector_blueprint, import_open_meteo_weather
from meridian_simulation.data_store import add_dataset, list_datasets
from meridian_simulation.job_store import enqueue_job, list_recent_jobs
from meridian_simulation.results import LATEST_RESULTS

api = Blueprint("api", __name__)


class SimulationRequest(BaseModel):
    project_id: str = Field(min_length=1)
    scenario_id: str = Field(min_length=1)
    engine: str = Field(min_length=1)
    objective: str = Field(min_length=1)
    annual_demand_mwh: float = Field(default=1_840_000, ge=0)
    peak_load_mw: float = Field(default=482, ge=0)
    renewable_share_target: float = Field(default=70, ge=0, le=100)
    assumptions: dict = Field(default_factory=dict)


class AssistantRequest(BaseModel):
    project_id: str = Field(min_length=1)
    scenario_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
    context_scope: str = "latest_result"


class DataImportRequest(BaseModel):
    source: str = Field(pattern="^open_meteo$")
    location_label: str = Field(default="Scenario site", min_length=1)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    forecast_days: int = Field(default=7, ge=1, le=16)


@api.get("/health")
def health():
    return {
        "service": "loadpath-meridian-simulation",
        "status": "ok",
    }


@api.get("/engines")
def engines():
    return {"data": SIMULATION_ENGINES}


@api.get("/data-connectors")
def data_connectors():
    return {"data": DATA_CONNECTORS}


@api.get("/data-connectors/<connector_id>")
def data_connector(connector_id: str):
    if connector_id == "open_meteo":
        return {
            "data": {
                "source": "open_meteo",
                "endpoint": "https://api.open-meteo.com/v1/forecast",
                "variables": [
                    "temperature_2m",
                    "wind_speed_10m",
                    "shortwave_radiation",
                ],
                "status": "live",
            },
        }

    if connector_id not in {"nasa_power", "eia", "pvwatts"}:
        return jsonify({"errors": [{"msg": "Unknown data connector"}]}), 404

    return {"data": connector_blueprint(connector_id)}


@api.get("/projects/<project_id>/scenarios/<scenario_id>/datasets")
def scenario_datasets(project_id: str, scenario_id: str):
    return {"data": list_datasets(project_id, scenario_id)}


@api.post("/projects/<project_id>/scenarios/<scenario_id>/datasets/import")
def import_scenario_dataset(project_id: str, scenario_id: str):
    try:
        payload = DataImportRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return jsonify({"errors": exc.errors()}), 422

    dataset = import_open_meteo_weather(payload.model_dump())
    dataset["project_id"] = project_id
    dataset["scenario_id"] = scenario_id

    return jsonify({"data": add_dataset(project_id, scenario_id, dataset)}), 201


@api.get("/simulations/recent")
def recent_simulations():
    return {"data": list_recent_jobs()}


@api.get("/projects/<project_id>/scenarios/<scenario_id>/results/latest")
def latest_result(project_id: str, scenario_id: str):
    result = LATEST_RESULTS.get((project_id, scenario_id))

    if result is None:
        return jsonify({"errors": [{"msg": "No completed result for scenario"}]}), 404

    return {"data": result}


@api.post("/simulations")
def create_simulation():
    try:
        payload = SimulationRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return jsonify({"errors": exc.errors()}), 422

    engine_ids = {engine["id"] for engine in SIMULATION_ENGINES}
    if payload.engine not in engine_ids:
        return jsonify({"errors": [{"msg": "Unknown simulation engine"}]}), 422

    job = enqueue_job(payload.model_dump())

    return jsonify(job), 202


@api.post("/assistant/context")
def assistant_context():
    try:
        payload = AssistantRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return jsonify({"errors": exc.errors()}), 422

    settings = current_app.config["MERIDIAN_SETTINGS"]

    return {
        "modal_endpoint_configured": bool(settings.modal_llm_endpoint),
        "context": {
            "project_id": payload.project_id,
            "scenario_id": payload.scenario_id,
            "scope": payload.context_scope,
            "message": payload.message,
            "available_sections": [
                "scenario assumptions",
                "simulation summary",
                "asset portfolio",
                "weather summary",
                "cost and emissions summary",
            ],
        },
    }


@api.post("/assistant/analyse")
def assistant_analyse():
    try:
        payload = AssistantRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return jsonify({"errors": exc.errors()}), 422

    settings = current_app.config["MERIDIAN_SETTINGS"]

    return {
        "data": analyse_scenario(
            project_id=payload.project_id,
            scenario_id=payload.scenario_id,
            message=payload.message,
            modal_endpoint=settings.modal_llm_endpoint,
        )
    }
