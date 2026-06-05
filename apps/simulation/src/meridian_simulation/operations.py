from time import perf_counter

from redis import Redis
from redis.exceptions import RedisError

from meridian_simulation.config import Settings
from meridian_simulation.database import database_status, job_status_counts


def service_status(settings: Settings) -> dict:
    redis_check = redis_status(settings.redis_url)
    worker_check = worker_status(settings)
    queue_counts = queue_status_counts(settings)
    checks = {
        "database": database_status(settings),
        "redis": redis_check["status"],
        "worker": worker_check["status"],
        "modal_llm": "configured" if settings.modal_llm_endpoint else "not_configured",
        "nrel_api": "configured" if settings.nrel_api_key else "not_configured",
        "eia_api": "configured" if settings.eia_api_key else "not_configured",
    }

    required_checks = ["database", "redis"]
    if not settings.sync_jobs:
        required_checks.append("worker")

    status = "ok" if all(checks[check] == "ok" for check in required_checks) else "degraded"

    return {
        "service": "loadpath-meridian-simulation",
        "status": status,
        "environment": settings.app_env,
        "checks": checks,
        "redis": redis_check,
        "worker": worker_check,
        "queue": {
            "mode": "sync" if settings.sync_jobs else "celery",
            "counts": queue_counts,
        },
        "queue_mode": "sync" if settings.sync_jobs else "celery",
        "frontend_origins": list(settings.frontend_origins),
        "request_id_header": "X-Request-ID",
    }


def redis_status(redis_url: str) -> dict:
    started_at = perf_counter()
    try:
        client = Redis.from_url(
            redis_url,
            socket_connect_timeout=0.2,
            socket_timeout=0.2,
        )
        client.ping()
    except RedisError:
        return {"status": "unavailable", "latency_ms": None}

    return {"status": "ok", "latency_ms": round((perf_counter() - started_at) * 1000, 2)}


def worker_status(settings: Settings) -> dict:
    if settings.sync_jobs:
        return {
            "status": "not_required",
            "active_workers": 0,
            "mode": "sync",
        }

    try:
        from meridian_simulation.tasks import celery_app

        replies = celery_app.control.ping(timeout=0.5)
    except Exception:
        return {
            "status": "unavailable",
            "active_workers": 0,
            "mode": "celery",
        }

    return {
        "status": "ok" if replies else "unavailable",
        "active_workers": len(replies),
        "mode": "celery",
    }


def queue_status_counts(settings: Settings) -> dict[str, int]:
    try:
        return job_status_counts(settings)
    except Exception:
        return {
            "queued": 0,
            "running": 0,
            "complete": 0,
            "failed": 0,
        }
