# Build Phases

## Phase 1: Foundation

- Initialize Git repository
- Scaffold React frontend
- Scaffold Laravel platform API
- Scaffold Flask simulation API
- Add background worker service
- Add Docker Compose for local orchestration
- Add smoke-check documentation

## Phase 2: Project Workspace

- Add database-backed platform projects
- Add database-backed scenario records
- Add project and scenario API endpoints
- Add simulation queue API
- Add latest result summary API
- Connect the React dashboard to Laravel and Flask services
- Verify desktop and mobile rendering with screenshots

## Phase 3: Scenario Builder

- Add project creation API
- Add scenario creation API
- Add simulation queue submission contract
- Add scenario builder form in the project workspace
- Queue a simulation after scenario creation
- Refresh project scenario counts and simulation queue state

## Phase 4: Generated Simulation Results

- Add deterministic energy-system simulation runner
- Generate dispatch, generation mix, cost, emissions, curtailment, and recommendations
- Store generated results behind the latest-result endpoint
- Mark submitted simulation jobs complete with progress
- Render generation mix, cost breakdown, and dispatch samples in React

## Phase 5: External Data Connectors

- Add Open-Meteo live weather import
- Add connector contracts for NASA POWER, EIA, and PVWatts
- Store imported datasets by project and scenario
- Feed latest imported dataset summary into generated simulation results
- Add scenario data import workflow in React
- Render imported weather/input summaries

## Phase 6: Frontend Routing and Product Pages

- Add React Router
- Add persistent application shell with active navigation
- Move workspace dashboard into a route-level page
- Add projects, simulations, data sources, and reports pages
- Split frontend code into pages and shared formatting helpers

## Phase 7: Modal AI Assistant

- Add backend assistant context builder
- Add Modal LLM analysis client
- Add local fallback analysis when Modal is not configured
- Add assistant analysis endpoint
- Add workspace assistant panel with suggested prompts
- Render assistant source and response in React

## Phase 8: Scenario Comparison and Reports

- Add project scenario comparison endpoint
- Compare completed simulation results by cost, emissions, renewable share, curtailment, and reliability
- Add decision indicators for best value, lowest emissions, highest renewable share, and highest risk
- Replace reports placeholder with a selectable comparison report page
- Add report-ready summary cards and comparison table

## Phase 9: Deployment and Operations

- Add backend operations status endpoints for platform and simulation services
- Add explicit frontend-origin CORS configuration for the simulation API
- Add Railway config-as-code for platform and simulation Docker services
- Add Vercel config for the React single-page app
- Add production Docker health checks and dynamic `PORT` support
- Add deployment environment templates for frontend, platform, and simulation services
- Document Railway/Vercel deployment, worker start command, health probes, and verification flow

## Phase 10: Real Engine Adapters

- Add engine adapter layer behind the normalized simulation result contract
- Build PyPSA networks and attempt solver-backed optimisation when PyPSA is installed
- Build and run pandapower load-flow networks when pandapower is installed
- Configure NREL PySAM PVWatts models when PySAM is installed
- Run pvlib clear-sky irradiance calculations when pvlib is installed
- Add OSeMOSYS tooling boundary through `otoole`
- Add optional `energy` dependency extra and Docker build arg for real engine packages
- Surface engine execution status in the workspace result panel

## Phase 11: Persistent Simulation Runtime

- Add SQL-backed simulation job and result storage
- Seed initial simulation jobs and completed results into the simulation database
- Store submitted payloads, assumptions, status transitions, latest results, and worker errors
- Move simulation execution behind Redis-backed Celery tasks
- Keep direct local runs synchronous by default for fast development
- Configure Docker Compose so Flask and Celery worker share MariaDB and Redis
- Add operations status reporting for simulation database and queue mode

## Future Phases

Future phases should add full product workflows without reframing the app as a
demo or MVP:

- Data source integrations
- Results dashboards
- Reports and exports
- Exportable report packages
- Production telemetry and usage metering
