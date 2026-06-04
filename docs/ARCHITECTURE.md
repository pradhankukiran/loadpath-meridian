# Architecture

Loadpath Meridian uses three primary application surfaces.

## React Web App

Path: `apps/web`

The web app is the client-facing workspace for projects, scenarios, simulation
configuration, queue status, results, reports, and AI-assisted analysis.

## Laravel Platform API

Path: `apps/platform`

The platform API owns product and account workflows:

- users and teams
- project ownership
- subscriptions and plan state
- administration
- API access between the web app and backend services

## Flask Simulation API

Path: `apps/simulation`

The simulation API owns technical modelling workflows:

- simulation engine registry
- data connector registry
- simulation job creation
- worker orchestration
- result summaries
- Modal LLM context assembly

## Runtime Flow

```text
React web
  -> Laravel platform API
  -> Flask simulation API
  -> Celery worker
  -> Redis queue
  -> energy engines and external data APIs
```

The Modal-hosted LLM endpoint is called from backend services, not directly from
the browser. That keeps prompts, context assembly, retries, and usage logging
inside controlled service boundaries.
