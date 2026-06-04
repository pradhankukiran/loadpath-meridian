from meridian_simulation.connectors import import_open_meteo_weather


class FakeResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {
            "hourly": {
                "time": ["2026-06-04T00:00", "2026-06-04T01:00"],
                "temperature_2m": [20.0, 22.0],
                "wind_speed_10m": [8.0, 10.0],
                "shortwave_radiation": [0.0, 120.0],
            }
        }


def fake_get(url, params, timeout):
    assert url == "https://api.open-meteo.com/v1/forecast"
    assert params["hourly"] == "temperature_2m,wind_speed_10m,shortwave_radiation"
    assert timeout == 20
    return FakeResponse()


def test_open_meteo_import_summarises_weather_data():
    dataset = import_open_meteo_weather(
        {
            "location_label": "Manchester",
            "latitude": 53.48,
            "longitude": -2.24,
            "forecast_days": 1,
        },
        http_get=fake_get,
    )

    assert dataset["source"] == "open_meteo"
    assert dataset["summary"]["records"] == 2
    assert dataset["summary"]["temperature_2m_mean_c"] == 21.0
    assert dataset["summary"]["shortwave_radiation_peak_wm2"] == 120.0
    assert dataset["sample"][1]["wind_speed_10m"] == 10.0
