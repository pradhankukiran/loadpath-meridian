from redis import Redis
from redis.exceptions import RedisError

from meridian_simulation.config import Settings


def service_status(settings: Settings) -> dict:
    checks = {
        "redis": redis_status(settings.redis_url),
        "modal_llm": "configured" if settings.modal_llm_endpoint else "not_configured",
        "nrel_api": "configured" if settings.nrel_api_key else "not_configured",
        "eia_api": "configured" if settings.eia_api_key else "not_configured",
    }

    status = "ok" if checks["redis"] == "ok" else "degraded"

    return {
        "service": "loadpath-meridian-simulation",
        "status": status,
        "environment": settings.app_env,
        "checks": checks,
        "frontend_origins": list(settings.frontend_origins),
    }


def redis_status(redis_url: str) -> str:
    try:
        client = Redis.from_url(
            redis_url,
            socket_connect_timeout=0.2,
            socket_timeout=0.2,
        )
        client.ping()
    except RedisError:
        return "unavailable"

    return "ok"
