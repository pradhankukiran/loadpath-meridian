from celery import Celery

from meridian_simulation.config import Settings

settings = Settings.from_env()

celery_app = Celery(
    "loadpath_meridian_simulation",
    broker=settings.redis_url,
    backend=settings.redis_url,
)


@celery_app.task(name="simulation.run")
def run_simulation(payload: dict) -> dict:
    return {
        "status": "complete",
        "engine": payload["engine"],
        "scenario_id": payload["scenario_id"],
        "summary": {
            "total_cost": 0,
            "emissions_tonnes_co2e": 0,
            "renewable_share": 0,
        },
    }
