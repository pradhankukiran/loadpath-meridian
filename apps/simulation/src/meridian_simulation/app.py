from flask import Flask

from meridian_simulation.config import Settings
from meridian_simulation.routes import api


def create_app(settings: Settings | None = None) -> Flask:
    app = Flask(__name__)
    app.config["MERIDIAN_SETTINGS"] = settings or Settings.from_env()
    app.register_blueprint(api, url_prefix="/api")

    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return response

    return app
