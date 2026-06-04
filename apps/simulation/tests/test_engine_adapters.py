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
