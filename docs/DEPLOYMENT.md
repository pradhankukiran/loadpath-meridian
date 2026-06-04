# Deployment

## Hosting Shape

- Frontend: Vercel, deployed from `apps/web`
- Platform API: Railway Docker service from `apps/platform/Dockerfile`
- Simulation API: Railway Docker service from `apps/simulation/Dockerfile`
- Worker: Railway Docker service using the simulation image and Celery command
- Redis: Railway Redis
- Database: Railway MariaDB for platform data

## Local Orchestration

```bash
cd infra
docker compose up --build
```

Local URLs:

- React web: http://localhost:5173
- Laravel platform API: http://localhost:8080/api/health
- Flask simulation API: http://localhost:5001/api/health

Operations status:

- Laravel platform API: http://localhost:8080/api/operations/status
- Flask simulation API: http://localhost:5001/api/operations/status

## Vercel Frontend

Deploy `apps/web` as the Vercel project root.

Required environment variables:

- `VITE_PLATFORM_API_URL`: Railway platform API URL ending in `/api`
- `VITE_SIMULATION_API_URL`: Railway simulation API URL ending in `/api`

The frontend includes `vercel.json` with Vite build settings and a single-page
app rewrite to `index.html`.

## Railway Platform API

Deploy `apps/platform` as a Railway service. The included `railway.json` uses
the Dockerfile builder and `/api/health` as the health check path.

Required environment variables:

- `APP_NAME`: `Loadpath Meridian`
- `APP_ENV`: `production`
- `APP_KEY`: generated Laravel key
- `APP_DEBUG`: `false`
- `APP_URL`: public Railway platform URL
- `FRONTEND_URL`: public Vercel frontend URL
- `DB_CONNECTION`: `mysql`
- `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`: Railway database values

The container runs migrations and seeds on start so the walkthrough environment
has project, scenario, and subscription data immediately.

## Railway Simulation API

Deploy `apps/simulation` as a Railway service. The included `railway.json` uses
the Dockerfile builder and `/api/health` as the health check path.

Required environment variables:

- `APP_ENV`: `production`
- `FRONTEND_URL`: public Vercel frontend URL
- `REDIS_URL`: Railway Redis URL
- `MODAL_LLM_ENDPOINT`: Modal-hosted LLM inference endpoint
- `NREL_API_KEY`: optional NREL key for PVWatts
- `EIA_API_KEY`: optional EIA key
- `GUNICORN_WORKERS`: defaults to `2`
- `GUNICORN_TIMEOUT`: defaults to `120`

To run real modelling libraries inside the simulation image, build with:

```bash
INSTALL_ENERGY_EXTRAS=true
```

That installs PyPSA, pandapower, NREL PySAM, pvlib, oemof/pyomo tooling,
OSeMOSYS tooling, and the HiGHS solver. Without this build arg, the API still
returns normalized results and reports `engine_adapter.status` as `unavailable`
for engines whose libraries are not present.

## Railway Simulation Worker

Create a second Railway service from the same `apps/simulation` source and
Dockerfile. Override the start command:

```bash
celery -A meridian_simulation.tasks.celery_app worker --loglevel=INFO
```

Use the same `REDIS_URL`, `MODAL_LLM_ENDPOINT`, `NREL_API_KEY`, and `EIA_API_KEY`
values as the simulation API.

## Health And Operations

Public health probes:

- `GET /api/health` on platform
- `GET /api/health` on simulation

Operational checks:

- `GET /api/operations/status` on platform reports database, queue, cache, environment, and frontend URL.
- `GET /api/operations/status` on simulation reports Redis, Modal, NREL, EIA, environment, and allowed frontend origins.

## Deployment Verification

After deployment:

1. Open the Vercel frontend.
2. Confirm project data loads from the platform API.
3. Open `/reports` and confirm scenario comparison loads from the simulation API.
4. Open both `/api/health` endpoints.
5. Open both `/api/operations/status` endpoints.
6. Submit a scenario run and confirm latest results render.
7. Ask the AI assistant a scenario question and confirm the response source is `modal` when `MODAL_LLM_ENDPOINT` is configured.
8. Confirm the latest result's engine execution panel shows `executed` or `model built` when energy extras are installed.

## Environment Templates

- `MODAL_LLM_ENDPOINT`: Modal-hosted LLM inference endpoint
- `NREL_API_KEY`: NREL Developer Network key
- `EIA_API_KEY`: EIA Open Data key
- `apps/web/.env.example`: local frontend API values
- `apps/platform/.env.production.example`: Railway platform API values
- `apps/simulation/.env.example`: local and Railway simulation values
