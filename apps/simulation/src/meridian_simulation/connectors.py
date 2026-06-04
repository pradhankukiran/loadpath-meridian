from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import requests


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def import_open_meteo_weather(payload: dict, http_get=requests.get) -> dict:
    params = {
        "latitude": payload["latitude"],
        "longitude": payload["longitude"],
        "hourly": ",".join([
            "temperature_2m",
            "wind_speed_10m",
            "shortwave_radiation",
        ]),
        "forecast_days": payload.get("forecast_days", 7),
        "timezone": "auto",
    }

    response = http_get(OPEN_METEO_URL, params=params, timeout=20)
    response.raise_for_status()
    raw = response.json()
    hourly = raw.get("hourly", {})

    temperatures = hourly.get("temperature_2m", [])
    wind_speeds = hourly.get("wind_speed_10m", [])
    radiation = hourly.get("shortwave_radiation", [])

    return {
        "id": f"dat_{uuid4().hex[:12]}",
        "source": "open_meteo",
        "name": "Open-Meteo weather forecast",
        "location": {
            "label": payload.get("location_label", "Scenario site"),
            "latitude": payload["latitude"],
            "longitude": payload["longitude"],
        },
        "imported_at": datetime.now(UTC).isoformat(),
        "summary": {
            "records": len(hourly.get("time", [])),
            "temperature_2m_mean_c": mean(temperatures),
            "wind_speed_10m_mean_kmh": mean(wind_speeds),
            "shortwave_radiation_mean_wm2": mean(radiation),
            "shortwave_radiation_peak_wm2": max_or_zero(radiation),
            "time_start": first_or_none(hourly.get("time", [])),
            "time_end": last_or_none(hourly.get("time", [])),
        },
        "sample": [
            {
                "time": time,
                "temperature_2m": temperatures[index],
                "wind_speed_10m": wind_speeds[index],
                "shortwave_radiation": radiation[index],
            }
            for index, time in enumerate(hourly.get("time", [])[:12])
        ],
    }


def connector_blueprint(connector_id: str) -> dict:
    blueprints = {
        "nasa_power": {
            "source": "nasa_power",
            "endpoint": "https://power.larc.nasa.gov/api/temporal/hourly/point",
            "parameters": ["T2M", "WS10M", "ALLSKY_SFC_SW_DWN"],
            "status": "configured",
        },
        "eia": {
            "source": "eia",
            "endpoint": "https://api.eia.gov/v2/",
            "requires_api_key": True,
            "status": "configured",
        },
        "pvwatts": {
            "source": "pvwatts",
            "endpoint": "https://developer.nrel.gov/api/pvwatts/v8.json",
            "requires_api_key": True,
            "status": "configured",
        },
    }

    return blueprints[connector_id]


def mean(values: list[float | int]) -> float:
    if not values:
        return 0.0

    return round(sum(values) / len(values), 2)


def max_or_zero(values: list[float | int]) -> float:
    if not values:
        return 0.0

    return max(values)


def first_or_none(values: list) -> str | None:
    return values[0] if values else None


def last_or_none(values: list) -> str | None:
    return values[-1] if values else None
