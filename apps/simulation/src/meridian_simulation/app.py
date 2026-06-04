from flask import Flask, request

from meridian_simulation.config import Settings
from meridian_simulation.routes import api


def create_app(settings: Settings | None = None) -> Flask:
    app = Flask(__name__)
    app.config["MERIDIAN_SETTINGS"] = settings or Settings.from_env()
    app.register_blueprint(api, url_prefix="/api")

    @app.after_request
    def add_cors_headers(response):
        configured_origins = app.config["MERIDIAN_SETTINGS"].frontend_origins
        request_origin = request.headers.get("Origin")
        allowed_origin = None

        if "*" in configured_origins:
            allowed_origin = "*"
        elif request_origin in configured_origins:
            allowed_origin = request_origin

        if allowed_origin:
            response.headers["Access-Control-Allow-Origin"] = allowed_origin
            response.headers["Vary"] = "Origin"

        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return response

    return app
