SIMULATION_ENGINES = [
    {
        "id": "pypsa",
        "name": "PyPSA",
        "capabilities": [
            "energy-system optimisation",
            "capacity expansion",
            "renewable generation dispatch",
            "storage dispatch",
        ],
    },
    {
        "id": "pandapower",
        "name": "pandapower",
        "capabilities": [
            "power flow",
            "optimal power flow",
            "grid topology analysis",
            "short-circuit analysis",
        ],
    },
    {
        "id": "pysam",
        "name": "NREL PySAM",
        "capabilities": [
            "solar performance",
            "battery performance",
            "wind performance",
            "project financial models",
        ],
    },
    {
        "id": "pvlib",
        "name": "pvlib",
        "capabilities": [
            "solar irradiance processing",
            "PV system performance",
            "weather-to-generation modelling",
        ],
    },
    {
        "id": "osemosys",
        "name": "OSeMOSYS",
        "capabilities": [
            "long-term planning",
            "capacity expansion",
            "policy scenario modelling",
        ],
    },
]

DATA_CONNECTORS = [
    {
        "id": "nrel",
        "name": "NREL Developer Network",
        "coverage": "United States",
        "uses": ["solar", "wind", "buildings", "renewable resource data"],
    },
    {
        "id": "pvwatts",
        "name": "NREL PVWatts",
        "coverage": "Global where resource data is available",
        "uses": ["quick PV production estimates"],
    },
    {
        "id": "nasa_power",
        "name": "NASA POWER",
        "coverage": "Global",
        "uses": ["meteorology", "solar radiation", "climate data"],
    },
    {
        "id": "open_meteo",
        "name": "Open-Meteo",
        "coverage": "Global",
        "uses": ["forecast weather", "historical weather"],
    },
    {
        "id": "eia",
        "name": "EIA Open Data",
        "coverage": "United States",
        "uses": ["electricity", "generation", "prices", "capacity"],
    },
    {
        "id": "entsoe",
        "name": "ENTSO-E Transparency Platform",
        "coverage": "Europe",
        "uses": ["load", "generation", "market data"],
    },
]
