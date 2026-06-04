RECENT_SIMULATION_JOBS = [
    {
        "id": "sim_1042",
        "project_id": "prj_nw_grid",
        "scenario_id": "scn_nw_storage",
        "engine": "pypsa",
        "model": "PyPSA capacity expansion",
        "status": "running",
        "progress": 64,
        "submitted_at": "2026-06-04T08:10:00Z",
    },
    {
        "id": "sim_1041",
        "project_id": "prj_solar_storage",
        "scenario_id": "scn_az_hybrid",
        "engine": "pysam",
        "model": "NREL PySAM hybrid plant",
        "status": "complete",
        "progress": 100,
        "submitted_at": "2026-06-04T07:42:00Z",
    },
    {
        "id": "sim_1040",
        "project_id": "prj_heat_network",
        "scenario_id": "scn_heat_peak",
        "engine": "pandapower",
        "model": "pandapower load flow",
        "status": "queued",
        "progress": 0,
        "submitted_at": "2026-06-04T07:31:00Z",
    },
]

LATEST_RESULTS = {
    ("prj_nw_grid", "scn_nw_base"): {
        "scenario_id": "scn_nw_base",
        "status": "complete",
        "engine": "pypsa",
        "engine_adapter": {
            "engine": "pypsa",
            "status": "unavailable",
            "message": "Install the energy extra to run PyPSA models.",
        },
        "total_cost_million": 418.6,
        "renewable_share_percent": 70.4,
        "emissions_tonnes_co2e": 284000,
        "curtailment_mwh": 42600,
        "reliability_margin_percent": 13.2,
        "generation_mix": [
            {"label": "Solar", "mwh": 514000},
            {"label": "Wind", "mwh": 742000},
            {"label": "Storage discharge", "mwh": 126000},
            {"label": "Grid imports", "mwh": 458000},
        ],
        "cost_breakdown": [
            {"label": "Generation", "million": 261.4},
            {"label": "Network capacity", "million": 79.5},
            {"label": "Carbon", "million": 77.1},
        ],
        "dispatch_profile": [
            {
                "hour": hour,
                "demand_mw": 220 + hour * 4,
                "solar_mw": max(0, 180 - abs(12 - hour) * 28),
                "wind_mw": 140,
                "storage_mw": 60 if 17 <= hour <= 21 else 0,
                "grid_mw": 90,
                "curtailment_mw": 12 if 10 <= hour <= 14 else 0,
            }
            for hour in range(24)
        ],
        "recommendations": [
            "Increase short-duration storage before adding new peaking generation.",
            "Test a tighter grid import constraint against winter peak demand.",
            "Review curtailment around high-wind overnight periods.",
        ],
    },
    ("prj_solar_storage", "scn_az_hybrid"): {
        "scenario_id": "scn_az_hybrid",
        "status": "complete",
        "engine": "pysam",
        "engine_adapter": {
            "engine": "pysam",
            "status": "unavailable",
            "message": "Install the energy extra to run NREL PySAM models.",
        },
        "total_cost_million": 236.1,
        "renewable_share_percent": 84.8,
        "emissions_tonnes_co2e": 122000,
        "curtailment_mwh": 18300,
        "reliability_margin_percent": 18.6,
        "generation_mix": [
            {"label": "Solar", "mwh": 418000},
            {"label": "Wind", "mwh": 0},
            {"label": "Storage discharge", "mwh": 86000},
            {"label": "Grid imports", "mwh": 116000},
        ],
        "cost_breakdown": [
            {"label": "Generation", "million": 151.2},
            {"label": "Network capacity", "million": 25.6},
            {"label": "Carbon", "million": 60.3},
        ],
        "dispatch_profile": [
            {
                "hour": hour,
                "demand_mw": 68 + hour * 1.8,
                "solar_mw": max(0, 135 - abs(12 - hour) * 22),
                "wind_mw": 0,
                "storage_mw": 35 if 17 <= hour <= 21 else 0,
                "grid_mw": 28,
                "curtailment_mw": 8 if 11 <= hour <= 14 else 0,
            }
            for hour in range(24)
        ],
        "recommendations": [
            "Battery utilisation is highest with a 17:00 to 21:00 discharge window.",
            "The inverter loading ratio is reasonable for the modeled resource profile.",
            "Run a tariff sensitivity before finalising storage sizing.",
        ],
    },
}
