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

## Service Boundary

The Laravel platform API owns users, subscriptions, teams, and project access.
This Flask API owns technical simulation configuration, execution, result
summaries, external energy data connectors, and AI analysis context.
