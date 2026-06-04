# Deployment Shape

## Client Walkthrough Hosting

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

## Environment Variables

- `MODAL_LLM_ENDPOINT`: Modal-hosted LLM inference endpoint
- `NREL_API_KEY`: NREL Developer Network key
- `EIA_API_KEY`: EIA Open Data key
