from flask import Flask

from meridian_simulation.config import Settings
from meridian_simulation.routes import api


def create_app(settings: Settings | None = None) -> Flask:
    app = Flask(__name__)
    app.config["MERIDIAN_SETTINGS"] = settings or Settings.from_env()
    app.register_blueprint(api, url_prefix="/api")
    return app
