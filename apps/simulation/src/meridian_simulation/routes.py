from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from pydantic import BaseModel, Field, ValidationError

from meridian_simulation.catalog import DATA_CONNECTORS, SIMULATION_ENGINES

api = Blueprint("api", __name__)


class SimulationRequest(BaseModel):
    project_id: str = Field(min_length=1)
    scenario_id: str = Field(min_length=1)
    engine: str = Field(min_length=1)
    objective: str = Field(min_length=1)
    assumptions: dict = Field(default_factory=dict)


class AssistantRequest(BaseModel):
    project_id: str = Field(min_length=1)
    scenario_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
    context_scope: str = "latest_result"


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


@api.post("/simulations")
def create_simulation():
    try:
        payload = SimulationRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return jsonify({"errors": exc.errors()}), 422

    engine_ids = {engine["id"] for engine in SIMULATION_ENGINES}
    if payload.engine not in engine_ids:
        return jsonify({"errors": [{"msg": "Unknown simulation engine"}]}), 422

    job_id = f"sim_{uuid4().hex[:12]}"

    return jsonify({
        "id": job_id,
        "status": "queued",
        "project_id": payload.project_id,
        "scenario_id": payload.scenario_id,
        "engine": payload.engine,
        "objective": payload.objective,
    }), 202


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
