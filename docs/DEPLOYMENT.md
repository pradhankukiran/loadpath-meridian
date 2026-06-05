# Deployment

## Hosting Shape

- Frontend: Vercel, deployed from `apps/web`
- Platform API: Railway Docker service from `apps/platform/Dockerfile`
- Simulation API: Railway Docker service from `apps/simulation/Dockerfile`
- Worker: Railway Docker service using the simulation image and Celery command
- Redis: Railway Redis
- Database: Railway MariaDB for platform and simulation data

## Local Orchestration

```bash
cd infra
export PLATFORM_APP_KEY="$(php ../apps/platform/artisan key:generate --show)"
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
- `SIMULATION_DATABASE_URL`: SQLAlchemy database URL for simulation jobs and results
- `SIMULATION_ARTIFACT_DIR`: writable directory for generated model/data/solution artifacts
- `SIMULATION_SYNC_JOBS`: `false` for Celery-backed async execution
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
values as the simulation API. Use the same `SIMULATION_DATABASE_URL` and keep
`SIMULATION_SYNC_JOBS=false` so the worker owns execution.

## Health And Operations

Public health probes:

- `GET /api/health` on platform
- `GET /api/health` on simulation

Operational checks:

- `GET /api/operations/status` on platform reports database, queue, cache, environment, frontend URL, logging channel, and request ID support.
- `GET /api/operations/status` on simulation reports database, Redis latency, Celery worker health, queue mode, persisted job counts, Modal, NREL, EIA, environment, and allowed frontend origins.
- `/operations` in the React app renders both operations contracts and refreshes them every 30 seconds.

All browser API calls send `X-Request-ID`. Laravel and Flask echo the same
header in responses, and both services include the request ID in service logs.
When investigating a failed action, copy the response `X-Request-ID` from the
browser network panel and search Railway logs for that value.

Simulation API and worker logs are JSON-formatted. Useful log events:

- `http_request_completed`: Flask request completion with method, path, status, and duration
- `simulation_task_started`: Celery worker picked up a simulation job
- `simulation_task_finished`: Celery worker finished a simulation job
- `simulation_job_failed`: simulation execution failed and the job row was marked failed

## Deployment Verification

After deployment:

1. Open the Vercel frontend.
2. Confirm project data loads from the platform API.
3. Open `/reports` and confirm scenario comparison loads from the simulation API.
4. Open both `/api/health` endpoints.
5. Open both `/api/operations/status` endpoints.
6. Open `/operations` and confirm platform and simulation checks are `ok`.
7. Confirm the simulation operations payload shows `queue.mode=celery` and at least one active worker.
8. Submit a scenario run and confirm it first appears as queued or running.
9. Confirm the worker completes the job and latest results render.
10. Ask the AI assistant a scenario question and confirm the response source is `modal` when `MODAL_LLM_ENDPOINT` is configured.
11. Confirm the latest result's engine execution panel shows `executed` or `model built` when energy extras are installed.

## Environment Templates

- `MODAL_LLM_ENDPOINT`: Modal-hosted LLM inference endpoint
- `SIMULATION_DATABASE_URL`: simulation job/result database URL
- `SIMULATION_ARTIFACT_DIR`: generated simulation artifact directory
- `SIMULATION_SYNC_JOBS`: `false` for Docker/Railway async execution, `true` for direct local runs
- `NREL_API_KEY`: NREL Developer Network key
- `EIA_API_KEY`: EIA Open Data key
- `apps/web/.env.example`: local frontend API values
- `apps/platform/.env.production.example`: Railway platform API values
- `apps/simulation/.env.example`: local and Railway simulation values
- `PLATFORM_APP_KEY`: local Docker-only Laravel key used by `infra/docker-compose.yml`
