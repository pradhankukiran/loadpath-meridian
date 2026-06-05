from __future__ import annotations

import json
import logging
import sys
import time
from datetime import UTC, datetime
from uuid import uuid4

from flask import Flask, g, request


REQUEST_ID_HEADER = "X-Request-ID"


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
        }

        for key in (
            "service",
            "request_id",
            "method",
            "path",
            "status_code",
            "duration_ms",
            "job_id",
            "task_id",
            "task_name",
            "event",
        ):
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str)


def configure_logging(service_name: str) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(logging.INFO)

    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    logging.LoggerAdapter(root_logger, {"service": service_name})


def init_request_observability(app: Flask, service_name: str) -> None:
    logger = logging.getLogger("meridian_simulation.http")

    @app.before_request
    def attach_request_context() -> None:
        g.request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid4())
        g.request_started_at = time.perf_counter()

    @app.after_request
    def add_request_id_and_log(response):
        request_id = getattr(g, "request_id", str(uuid4()))
        response.headers[REQUEST_ID_HEADER] = request_id

        started_at = getattr(g, "request_started_at", time.perf_counter())
        logger.info(
            "http_request_completed",
            extra={
                "service": service_name,
                "request_id": request_id,
                "method": request.method,
                "path": request.path,
                "status_code": response.status_code,
                "duration_ms": round((time.perf_counter() - started_at) * 1000, 2),
                "event": "http_request_completed",
            },
        )

        return response
