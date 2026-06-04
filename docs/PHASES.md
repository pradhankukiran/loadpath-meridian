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

## Future Phases

Future phases should add full product workflows without reframing the app as a
demo or MVP:

- Modal LLM assistant
- External simulation engine package integrations
- Data source integrations
- Results dashboards
- AI assistant backed by the Modal LLM endpoint
- Reports and exports
- Deployment configuration
