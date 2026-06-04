from __future__ import annotations

from dataclasses import dataclass
from importlib import import_module
from importlib.metadata import PackageNotFoundError, version
from typing import Any


@dataclass(frozen=True)
class AdapterOutcome:
    metadata: dict
    updates: dict | None = None


def run_engine_adapter(payload: dict, baseline_result: dict) -> AdapterOutcome:
    adapters = {
        "pypsa": run_pypsa_adapter,
        "pandapower": run_pandapower_adapter,
        "pysam": run_pysam_adapter,
        "pvlib": run_pvlib_adapter,
        "osemosys": run_osemosys_adapter,
    }

    adapter = adapters.get(payload["engine"])
    if adapter is None:
        return AdapterOutcome(metadata=unavailable_metadata(payload["engine"], "No adapter is registered."))

    try:
        return adapter(payload, baseline_result)
    except Exception as exc:
        return AdapterOutcome(
            metadata={
                "engine": payload["engine"],
                "status": "failed",
                "message": f"Adapter failed before producing a model result: {exc}",
            }
        )


def run_pypsa_adapter(payload: dict, baseline_result: dict) -> AdapterOutcome:
    pypsa = optional_module("pypsa")
    if pypsa is None:
        return AdapterOutcome(metadata=unavailable_metadata("pypsa", "Install the energy extra to run PyPSA models."))

    network = pypsa.Network()
    snapshots = list(range(24))
    dispatch = baseline_result["dispatch_profile"]
    assumptions = payload.get("assumptions", {})
    solver_name = str(assumptions.get("solver_name", "highs"))

    network.set_snapshots(snapshots)
    add_pypsa_component(network, "Bus", "electricity")
    add_pypsa_component(
        network,
        "Load",
        "demand",
        bus="electricity",
        p_set=[row["demand_mw"] for row in dispatch],
    )
    add_pypsa_component(
        network,
        "Generator",
        "solar",
        bus="electricity",
        p_nom=max(row["solar_mw"] for row in dispatch) or 1,
        p_max_pu=normalised_profile([row["solar_mw"] for row in dispatch]),
        marginal_cost=42,
    )
    add_pypsa_component(
        network,
        "Generator",
        "wind",
        bus="electricity",
        p_nom=max(row["wind_mw"] for row in dispatch) or 1,
        p_max_pu=normalised_profile([row["wind_mw"] for row in dispatch]),
        marginal_cost=55,
    )
    add_pypsa_component(
        network,
        "Generator",
        "grid_import",
        bus="electricity",
        p_nom=float(assumptions.get("grid_import_limit_mw", payload.get("peak_load_mw", 1))),
        marginal_cost=96,
    )
    add_pypsa_component(
        network,
        "StorageUnit",
        "battery",
        bus="electricity",
        p_nom=max(row["storage_mw"] for row in dispatch) or 1,
        max_hours=float(assumptions.get("storage_duration_hours", 4)),
        efficiency_store=0.92,
        efficiency_dispatch=0.92,
        marginal_cost=18,
    )

    solve_status = "model_built"
    solve_message = "PyPSA network was built; solver was not executed."

    try:
        if hasattr(network, "optimize"):
            network.optimize(solver_name=solver_name)
            solve_status = "executed"
            solve_message = f"PyPSA optimisation completed with the {solver_name} solver."
        elif hasattr(network, "lopf"):
            network.lopf(network.snapshots, solver_name=solver_name)
            solve_status = "executed"
            solve_message = f"PyPSA linear optimal power flow completed with the {solver_name} solver."
    except Exception as exc:
        solve_status = "model_built"
        solve_message = f"PyPSA network was built, but solver execution was not available: {exc}"

    return AdapterOutcome(
        metadata={
            "engine": "pypsa",
            "status": solve_status,
            "library": "pypsa",
            "library_version": package_version("pypsa"),
            "solver": solver_name,
            "message": solve_message,
            "model": {
                "snapshots": len(snapshots),
                "buses": safe_len(getattr(network, "buses", [])),
                "loads": safe_len(getattr(network, "loads", [])),
                "generators": safe_len(getattr(network, "generators", [])),
                "storage_units": safe_len(getattr(network, "storage_units", [])),
            },
        }
    )


def run_pandapower_adapter(payload: dict, baseline_result: dict) -> AdapterOutcome:
    pp = optional_module("pandapower")
    if pp is None:
        return AdapterOutcome(metadata=unavailable_metadata("pandapower", "Install the energy extra to run pandapower networks."))

    net = pp.create_empty_network()
    hv_bus = pp.create_bus(net, vn_kv=132, name="Grid supply")
    mv_bus = pp.create_bus(net, vn_kv=float(payload.get("assumptions", {}).get("grid_voltage_kv", 33)), name="Load bus")
    pp.create_ext_grid(net, bus=hv_bus, vm_pu=1.0, name="Transmission grid")
    pp.create_line_from_parameters(
        net,
        from_bus=hv_bus,
        to_bus=mv_bus,
        length_km=10,
        r_ohm_per_km=0.08,
        x_ohm_per_km=0.12,
        c_nf_per_km=12,
        max_i_ka=0.7,
        name="Reinforcement corridor",
    )
    pp.create_load(net, bus=mv_bus, p_mw=float(payload.get("peak_load_mw", 1)), q_mvar=0.25 * float(payload.get("peak_load_mw", 1)))
    pp.create_sgen(
        net,
        bus=mv_bus,
        p_mw=sum(item["mwh"] for item in baseline_result["generation_mix"] if item["label"] in {"Solar", "Wind"}) / 8760,
        q_mvar=0,
        name="Embedded renewables",
    )

    status = "executed"
    message = "pandapower load flow completed."
    updates = None

    try:
        pp.runpp(net)
        max_loading = max_from_frame(getattr(net, "res_line", None), "loading_percent")
        if max_loading is not None:
            updates = {
                "reliability_margin_percent": round(max(2.0, 100 - max_loading), 1),
            }
    except Exception as exc:
        status = "model_built"
        message = f"pandapower network was built, but load flow did not run: {exc}"

    return AdapterOutcome(
        metadata={
            "engine": "pandapower",
            "status": status,
            "library": "pandapower",
            "library_version": package_version("pandapower"),
            "message": message,
            "model": {
                "buses": safe_len(getattr(net, "bus", [])),
                "lines": safe_len(getattr(net, "line", [])),
                "loads": safe_len(getattr(net, "load", [])),
                "static_generators": safe_len(getattr(net, "sgen", [])),
            },
        },
        updates=updates,
    )


def run_pysam_adapter(payload: dict, baseline_result: dict) -> AdapterOutcome:
    pysam = optional_module("PySAM.Pvwattsv8")
    if pysam is None:
        return AdapterOutcome(metadata=unavailable_metadata("pysam", "Install the energy extra to run NREL PySAM models."))

    model = pysam.default("PVWattsNone")
    assumptions = payload.get("assumptions", {})
    system_capacity_kw = float(assumptions.get("solar_capacity_mw", payload.get("peak_load_mw", 1) * 0.7)) * 1000

    status = "model_built"
    message = "PySAM PVWatts model was configured; weather resource execution requires a full solar resource file."

    try:
        model.SystemDesign.system_capacity = system_capacity_kw
        model.SystemDesign.dc_ac_ratio = float(assumptions.get("inverter_loading_ratio", 1.2))
    except Exception as exc:
        message = f"PySAM PVWatts model was created, but design inputs could not be assigned: {exc}"

    return AdapterOutcome(
        metadata={
            "engine": "pysam",
            "status": status,
            "library": "nrel-pysam",
            "library_version": package_version("NREL-PySAM"),
            "message": message,
            "model": {
                "module": "PySAM.Pvwattsv8",
                "system_capacity_kw": round(system_capacity_kw, 2),
            },
        }
    )


def run_pvlib_adapter(payload: dict, baseline_result: dict) -> AdapterOutcome:
    pvlib = optional_module("pvlib")
    pandas = optional_module("pandas")
    if pvlib is None or pandas is None:
        return AdapterOutcome(metadata=unavailable_metadata("pvlib", "Install the energy extra to run pvlib solar calculations."))

    assumptions = payload.get("assumptions", {})
    latitude = float(assumptions.get("latitude", 53.48))
    longitude = float(assumptions.get("longitude", -2.24))

    location = pvlib.location.Location(latitude, longitude, tz="UTC")
    times = pandas.date_range("2026-06-01", periods=24, freq="h", tz="UTC")
    clearsky = location.get_clearsky(times)
    peak_ghi = float(clearsky["ghi"].max())

    updates = {
        "engine_resource_summary": {
            "source": "pvlib clear-sky model",
            "latitude": latitude,
            "longitude": longitude,
            "peak_ghi_wm2": round(peak_ghi, 2),
        }
    }

    return AdapterOutcome(
        metadata={
            "engine": "pvlib",
            "status": "executed",
            "library": "pvlib",
            "library_version": package_version("pvlib"),
            "message": "pvlib clear-sky irradiance profile completed.",
            "model": {
                "hours": len(times),
                "latitude": latitude,
                "longitude": longitude,
            },
        },
        updates=updates,
    )


def run_osemosys_adapter(payload: dict, baseline_result: dict) -> AdapterOutcome:
    otoole = optional_module("otoole")
    if otoole is None:
        return AdapterOutcome(metadata=unavailable_metadata("osemosys", "Install OSeMOSYS tooling to validate long-term planning datasets."))

    return AdapterOutcome(
        metadata={
            "engine": "osemosys",
            "status": "model_built",
            "library": "otoole",
            "library_version": package_version("otoole"),
            "message": "OSeMOSYS adapter is ready for dataset validation; optimisation requires a solver-backed model file.",
            "model": {
                "demand_mwh": payload.get("annual_demand_mwh"),
                "target_renewable_share": payload.get("renewable_share_target"),
            },
        }
    )


def add_pypsa_component(network: Any, component: str, name: str, **attrs: Any) -> None:
    network.add(component, name, **attrs)


def normalised_profile(values: list[float]) -> list[float]:
    maximum = max(values) or 1
    return [round(value / maximum, 5) for value in values]


def optional_module(name: str) -> Any | None:
    try:
        return import_module(name)
    except ImportError:
        return None


def unavailable_metadata(engine: str, message: str) -> dict:
    return {
        "engine": engine,
        "status": "unavailable",
        "message": message,
    }


def package_version(package_name: str) -> str | None:
    try:
        return version(package_name)
    except PackageNotFoundError:
        return None


def safe_len(value: Any) -> int:
    try:
        return len(value)
    except TypeError:
        return 0


def max_from_frame(frame: Any, column: str) -> float | None:
    if frame is None or not hasattr(frame, column):
        return None

    values = getattr(frame, column)
    if hasattr(values, "max"):
        return float(values.max())

    return None
