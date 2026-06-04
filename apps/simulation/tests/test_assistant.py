from meridian_simulation.app import create_app
from meridian_simulation.assistant import analyse_scenario
from meridian_simulation.config import Settings


class FakeModalResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {"analysis": "Modal says curtailment can be reduced with storage."}


def fake_modal_post(url, json, timeout):
    assert url == "https://modal.example/analyse"
    assert json["context"]["scenario_id"] == "scn_nw_base"
    assert timeout == 45
    return FakeModalResponse()


def test_assistant_endpoint_returns_local_analysis_without_modal():
    app = create_app(
        Settings(
            redis_url="redis://localhost:6379/0",
            modal_llm_endpoint=None,
            nrel_api_key=None,
            eia_api_key=None,
        )
    )
    client = app.test_client()

    response = client.post(
        "/api/assistant/analyse",
        json={
            "project_id": "prj_nw_grid",
            "scenario_id": "scn_nw_base",
            "message": "Explain this result.",
        },
    )

    assert response.status_code == 200
    assert response.json["data"]["source"] == "local"
    assert "renewable share" in response.json["data"]["analysis"]


def test_assistant_uses_modal_when_endpoint_is_configured():
    result = analyse_scenario(
        project_id="prj_nw_grid",
        scenario_id="scn_nw_base",
        message="Reduce curtailment.",
        modal_endpoint="https://modal.example/analyse",
        http_post=fake_modal_post,
    )

    assert result["source"] == "modal"
    assert result["analysis"] == "Modal says curtailment can be reduced with storage."
