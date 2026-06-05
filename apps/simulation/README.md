# Loadpath Meridian Simulation API

Flask service for simulation configuration, engine orchestration, background
jobs, data connectors, and Modal-backed AI assistance.

## Local Commands

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
flask --app meridian_simulation.app:create_app run --port 5001
pytest
```

Direct local runs use `sqlite:///storage/simulation.db` and
`SIMULATION_SYNC_JOBS=true` by default. Docker Compose sets
`SIMULATION_DATABASE_URL` to MariaDB and `SIMULATION_SYNC_JOBS=false`, so the API
persists queued jobs and the Celery worker completes them asynchronously.

Install real engine libraries locally:

```bash
pip install -e ".[dev,energy]"
```

Build the simulation container with energy libraries:

```bash
docker build --build-arg INSTALL_ENERGY_EXTRAS=true -t loadpath-simulation .
```

## Service Boundary

The Laravel platform API owns users, subscriptions, teams, and project access.
This Flask API owns technical simulation configuration, execution, result
summaries, external energy data connectors, and AI analysis context.

## Engine Adapters

The simulation runner normalises every result into the same result contract, then
calls the selected engine adapter:

- `pypsa`: builds a PyPSA network and attempts optimisation with the configured solver.
- `pandapower`: builds and runs a load-flow network.
- `pysam`: converts imported hourly weather into PVWatts resource data and executes the model.
- `pvlib`: runs a clear-sky irradiance calculation.
- `osemosys`: generates model/data/solution artifacts and solves a capacity expansion model with Pyomo and HiGHS.

Results include `engine_adapter` metadata so the UI can show whether the real
library executed, only built a model, failed, or is unavailable in the runtime.
