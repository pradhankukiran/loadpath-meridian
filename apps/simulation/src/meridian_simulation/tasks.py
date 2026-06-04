from celery import Celery

from meridian_simulation.config import Settings
from meridian_simulation.database import initialize_database
from meridian_simulation.job_store import complete_job

settings = Settings.from_env()

celery_app = Celery(
    "loadpath_meridian_simulation",
    broker=settings.redis_url,
    backend=settings.redis_url,
)


@celery_app.task(name="simulation.run")
def run_simulation(job_id: str) -> dict:
    task_settings = Settings.from_env()
    initialize_database(task_settings)
    return complete_job(job_id, task_settings)
