from types import SimpleNamespace

from meridian_simulation.engine_runner import run_energy_system_simulation


class FakePypsaNetwork:
    def __init__(self):
        self.snapshots = []
        self.buses = []
        self.loads = []
        self.generators = []
        self.storage_units = []

    def set_snapshots(self, snapshots):
        self.snapshots = snapshots

    def add(self, component, name, **attrs):
        collection = {
            "Bus": self.buses,
            "Load": self.loads,
            "Generator": self.generators,
            "StorageUnit": self.storage_units,
        }[component]
        collection.append({"name": name, **attrs})

    def optimize(self, solver_name):
        self.solver_name = solver_name


class FakePvwattsModel:
    def __init__(self):
        self.SolarResource = SimpleNamespace(solar_resource_data=None)
        self.SystemDesign = FakeSystemDesign()
        self.Outputs = FakePvwattsOutputs()

    def execute(self):
        assert len(self.SolarResource.solar_resource_data["year"]) == 2
        self.Outputs.executed = True


class FakeSystemDesign:
    def __init__(self):
        self.inputs = {}

    def assign(self, values):
        self.inputs.update(values)


class FakePvwattsOutputs:
    def __init__(self):
        self.executed = False

    def export(self):
        assert self.executed is True
        return {
            "gen": [0.0, 120.0],
            "ac": [0.0, 120000.0],
        }


def test_pypsa_adapter_builds_and_executes_network_when_library_is_available(monkeypatch):
    def fake_import_module(name):
        if name == "pypsa":
            return SimpleNamespace(Network=FakePypsaNetwork)
        raise ImportError(name)

    monkeypatch.setattr("meridian_simulation.engine_adapters.import_module", fake_import_module)

    result = run_energy_system_simulation({
        "project_id": "prj_test",
        "scenario_id": "scn_pypsa",
        "engine": "pypsa",
        "objective": "Run a real PyPSA adapter path.",
        "annual_demand_mwh": 100000,
        "peak_load_mw": 50,
        "renewable_share_target": 70,
        "assumptions": {
            "solver_name": "highs",
        },
    })

    assert result["engine_adapter"]["status"] == "executed"
    assert result["engine_adapter"]["library"] == "pypsa"
    assert result["engine_adapter"]["model"]["snapshots"] == 24
    assert result["engine_adapter"]["model"]["generators"] == 3
    assert result["engine_adapter"]["model"]["storage_units"] == 1


def test_pysam_adapter_executes_with_imported_weather_records(monkeypatch):
    def fake_import_module(name):
        if name == "PySAM.Pvwattsv8":
            return SimpleNamespace(default=lambda _config: FakePvwattsModel())
        raise ImportError(name)

    monkeypatch.setattr("meridian_simulation.engine_adapters.import_module", fake_import_module)

    result = run_energy_system_simulation({
        "project_id": "prj_test",
        "scenario_id": "scn_pysam",
        "engine": "pysam",
        "objective": "Run PySAM against imported weather.",
        "annual_demand_mwh": 100000,
        "peak_load_mw": 50,
        "renewable_share_target": 70,
        "assumptions": {
            "solar_capacity_mw": 25,
        },
        "input_dataset": {
            "location": {
                "latitude": 53.48,
                "longitude": -2.24,
            },
            "records": [
                {
                    "time": "2026-06-04T00:00",
                    "temperature_2m": 16,
                    "wind_speed_10m": 10,
                    "shortwave_radiation": 0,
                },
                {
                    "time": "2026-06-04T01:00",
                    "temperature_2m": 17,
                    "wind_speed_10m": 12,
                    "shortwave_radiation": 120,
                },
            ],
        },
    })

    assert result["engine_adapter"]["status"] == "executed"
    assert result["engine_adapter"]["library"] == "nrel-pysam"
    assert result["engine_adapter"]["model"]["weather_records"] == 2
    assert result["engine_resource_summary"]["source"] == "PySAM PVWatts solar resource"
    assert result["engine_resource_summary"]["period_solar_generation_kwh"] == 120.0
    assert result["generation_mix"][0]["label"] == "Solar"


def test_adapter_reports_unavailable_when_optional_library_is_missing(monkeypatch):
    def fake_import_module(name):
        raise ImportError(name)

    monkeypatch.setattr("meridian_simulation.engine_adapters.import_module", fake_import_module)

    result = run_energy_system_simulation({
        "project_id": "prj_test",
        "scenario_id": "scn_grid",
        "engine": "pandapower",
        "objective": "Run a grid model.",
        "annual_demand_mwh": 100000,
        "peak_load_mw": 50,
        "renewable_share_target": 70,
        "assumptions": {},
    })

    assert result["engine_adapter"]["engine"] == "pandapower"
    assert result["engine_adapter"]["status"] == "unavailable"
    assert "Install the energy extra" in result["engine_adapter"]["message"]
