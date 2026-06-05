import logging

from celery import Celery

from meridian_simulation.config import Settings
from meridian_simulation.database import initialize_database
from meridian_simulation.job_store import complete_job
from meridian_simulation.observability import configure_logging

settings = Settings.from_env()
configure_logging("loadpath-meridian-simulation-worker")
logger = logging.getLogger("meridian_simulation.worker")

celery_app = Celery(
    "loadpath_meridian_simulation",
    broker=settings.redis_url,
    backend=settings.redis_url,
)


@celery_app.task(name="simulation.run")
def run_simulation(job_id: str) -> dict:
    task_settings = Settings.from_env()
    initialize_database(task_settings)
    logger.info(
        "simulation_task_started",
        extra={
            "service": "loadpath-meridian-simulation-worker",
            "job_id": job_id,
            "task_id": run_simulation.request.id,
            "task_name": "simulation.run",
            "event": "simulation_task_started",
        },
    )
    result = complete_job(job_id, task_settings)
    logger.info(
        "simulation_task_finished",
        extra={
            "service": "loadpath-meridian-simulation-worker",
            "job_id": job_id,
            "task_id": run_simulation.request.id,
            "task_name": "simulation.run",
            "event": "simulation_task_finished",
        },
    )
    return result
