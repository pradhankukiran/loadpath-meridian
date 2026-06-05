export type Project = {
  id: string
  name: string
  owner: string
  region: string
  grid_region: string | null
  description: string | null
  status: string
  scenarios_count?: number
  scenarios?: Scenario[]
}

export type Scenario = {
  id: string
  project_id: string
  name: string
  objective: string
  engine: string
  status: string
  horizon: string
  annual_demand_mwh: number
  peak_load_mw: number
  renewable_share_target: number
  assumptions: Record<string, number | string | boolean>
}

export type SimulationJob = {
  id: string
  project_id: string
  scenario_id: string
  engine: string
  model: string
  status: string
  progress: number
  submitted_at: string
  started_at?: string
  completed_at?: string
  error_message?: string
}

export type SimulationResult = {
  scenario_id: string
  status: string
  engine: string
  engine_adapter?: {
    engine: string
    status: string
    library?: string
    library_version?: string | null
    solver?: string
    message: string
    model?: Record<
      string,
      number | string | null | Array<Record<string, number | string>>
    >
  }
  engine_resource_summary?: Record<string, number | string>
  total_cost_million: number
  renewable_share_percent: number
  emissions_tonnes_co2e: number
  curtailment_mwh: number
  reliability_margin_percent: number
  generation_mix: Array<{ label: string; mwh: number }>
  cost_breakdown: Array<{ label: string; million: number }>
  input_data_summary: DatasetSummary | null
  dispatch_profile: Array<{
    hour: number
    demand_mw: number
    solar_mw: number
    wind_mw: number
    storage_mw: number
    grid_mw: number
    curtailment_mw: number
  }>
  recommendations: string[]
}

export type SimulationResultHistoryItem = {
  job_id: string
  project_id: string
  scenario_id: string
  engine: string
  model: string
  status: string
  submitted_at: string
  completed_at: string
  total_cost_million: number | null
  renewable_share_percent: number | null
  emissions_tonnes_co2e: number | null
  curtailment_mwh: number | null
  reliability_margin_percent: number | null
  engine_adapter_status: string | null
  solver: string | null
  artifact_count: number
}

export type DataConnector = {
  id: string
  name: string
  coverage: string
  uses: string[]
}

export type DatasetSummary = {
  records: number
  temperature_2m_mean_c?: number
  wind_speed_10m_mean_kmh?: number
  shortwave_radiation_mean_wm2?: number
  shortwave_radiation_peak_wm2?: number
  time_start?: string
  time_end?: string
}

export type ScenarioDataset = {
  id: string
  source: string
  name: string
  location: {
    label: string
    latitude: number
    longitude: number
  }
  imported_at: string
  summary: DatasetSummary
  sample: Array<Record<string, string | number>>
}

export type ImportDatasetPayload = {
  source: 'open_meteo'
  location_label: string
  latitude: number
  longitude: number
  forecast_days: number
}

export type AssistantAnalysis = {
  source: 'modal' | 'local'
  analysis: string
  context: {
    project_id: string
    scenario_id: string
    message: string
    latest_result: SimulationResult | null
    latest_dataset_summary: DatasetSummary | null
  }
}

export type AssistantAnalysisPayload = {
  project_id: string
  scenario_id: string
  message: string
  context_scope?: string
}

export type ScenarioComparison = {
  project_id: string
  scenario_count: number
  scenarios: Array<{
    scenario_id: string
    engine: string
    total_cost_million: number
    renewable_share_percent: number
    emissions_tonnes_co2e: number
    curtailment_mwh: number
    reliability_margin_percent: number
    generation_mix: Array<{ label: string; mwh: number }>
    cost_breakdown: Array<{ label: string; million: number }>
  }>
  indicators: {
    best_value_scenario_id: string | null
    lowest_emissions_scenario_id: string | null
    highest_renewable_scenario_id: string | null
    highest_risk_scenario_id: string | null
    summary: string
  }
}

export type ServiceOperationsStatus = {
  service: string
  status: string
  environment: string
  checks: Record<string, string>
  frontend_url?: string
  frontend_origins?: string[]
  request_id_header?: string
  logging?: {
    channel: string
    level: string
  }
  redis?: {
    status: string
    latency_ms: number | null
  }
  worker?: {
    status: string
    active_workers: number
    mode: string
  }
  queue?: {
    mode: string
    counts: Record<string, number>
  }
  queue_mode?: string
}

export type CreateProjectPayload = {
  name: string
  owner: string
  region: string
  grid_region?: string
  description?: string
  status?: string
}

export type CreateScenarioPayload = {
  name: string
  objective: string
  engine: string
  horizon: string
  annual_demand_mwh: number
  peak_load_mw: number
  renewable_share_target: number
  assumptions: Record<string, number | string | boolean>
}

export type SubmitSimulationPayload = {
  project_id: string
  scenario_id: string
  engine: string
  objective: string
  annual_demand_mwh: number
  peak_load_mw: number
  renewable_share_target: number
  assumptions: Record<string, number | string | boolean>
}

type ApiEnvelope<T> = {
  data: T
}

const platformApiUrl =
  import.meta.env.VITE_PLATFORM_API_URL ?? 'http://localhost:8080/api'

const simulationApiUrl =
  import.meta.env.VITE_SIMULATION_API_URL ?? 'http://localhost:5001/api'

export const fallbackProjects: Project[] = [
  {
    id: 'prj_nw_grid',
    name: 'North West grid reinforcement',
    owner: 'Infrastructure Planning',
    region: 'United Kingdom',
    grid_region: 'GB transmission north-west',
    description:
      'Network reinforcement study for load growth, renewables, and storage placement.',
    status: 'active',
    scenarios_count: 2,
  },
  {
    id: 'prj_solar_storage',
    name: 'Solar and storage capacity study',
    owner: 'Energy Transition',
    region: 'Arizona, United States',
    grid_region: 'WECC southwest',
    description:
      'Hybrid solar and battery sizing study using weather-driven generation assumptions.',
    status: 'review',
    scenarios_count: 1,
  },
  {
    id: 'prj_heat_network',
    name: 'Urban heat network expansion',
    owner: 'City Systems',
    region: 'Manchester, United Kingdom',
    grid_region: 'Local distribution network',
    description:
      'District energy expansion scenario for electrified heat and grid import constraints.',
    status: 'active',
    scenarios_count: 1,
  },
]

const fallbackScenarios: Record<string, Scenario[]> = {
  prj_nw_grid: [
    {
      id: 'scn_nw_base',
      project_id: 'prj_nw_grid',
      name: '2035 base demand',
      objective: 'Minimise system cost while meeting forecast demand.',
      engine: 'pypsa',
      status: 'ready',
      horizon: '2035',
      annual_demand_mwh: 1840000,
      peak_load_mw: 482,
      renewable_share_target: 68,
      assumptions: {
        storage_duration_hours: 4,
        carbon_price_gbp_per_tonne: 92,
        grid_import_limit_mw: 350,
      },
    },
  ],
  prj_solar_storage: [],
  prj_heat_network: [],
}

const fallbackJobs: SimulationJob[] = [
  {
    id: 'sim_1042',
    project_id: 'prj_nw_grid',
    scenario_id: 'scn_nw_storage',
    engine: 'pypsa',
    model: 'PyPSA capacity expansion',
    status: 'running',
    progress: 64,
    submitted_at: '2026-06-04T08:10:00Z',
  },
  {
    id: 'sim_1041',
    project_id: 'prj_solar_storage',
    scenario_id: 'scn_az_hybrid',
    engine: 'pysam',
    model: 'NREL PySAM hybrid plant',
    status: 'complete',
    progress: 100,
    submitted_at: '2026-06-04T07:42:00Z',
  },
]

const fallbackResult: SimulationResult = {
  scenario_id: 'scn_nw_base',
  status: 'complete',
  engine: 'pypsa',
  total_cost_million: 418.6,
  renewable_share_percent: 70.4,
  emissions_tonnes_co2e: 284000,
  curtailment_mwh: 42600,
  reliability_margin_percent: 13.2,
  generation_mix: [
    { label: 'Solar', mwh: 514000 },
    { label: 'Wind', mwh: 742000 },
    { label: 'Storage discharge', mwh: 126000 },
    { label: 'Grid imports', mwh: 458000 },
  ],
  cost_breakdown: [
    { label: 'Generation', million: 261.4 },
    { label: 'Network capacity', million: 79.5 },
    { label: 'Carbon', million: 77.1 },
  ],
  input_data_summary: null,
  dispatch_profile: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    demand_mw: 220 + hour * 4,
    solar_mw: Math.max(0, 180 - Math.abs(12 - hour) * 28),
    wind_mw: 140,
    storage_mw: hour >= 17 && hour <= 21 ? 60 : 0,
    grid_mw: 90,
    curtailment_mw: hour >= 10 && hour <= 14 ? 12 : 0,
  })),
  recommendations: [
    'Increase short-duration storage before adding new peaking generation.',
    'Test a tighter grid import constraint against winter peak demand.',
    'Review curtailment around high-wind overnight periods.',
  ],
  engine_adapter: {
    engine: 'pypsa',
    status: 'unavailable',
    message: 'Install the energy extra to run PyPSA models.',
  },
}

const fallbackResultHistory: SimulationResultHistoryItem[] = [
  {
    job_id: 'sim_seed_nw_base',
    project_id: 'prj_nw_grid',
    scenario_id: 'scn_nw_base',
    engine: 'pypsa',
    model: 'PyPSA energy-system optimisation',
    status: 'complete',
    submitted_at: '2026-06-04T07:20:00Z',
    completed_at: '2026-06-04T07:20:00Z',
    total_cost_million: fallbackResult.total_cost_million,
    renewable_share_percent: fallbackResult.renewable_share_percent,
    emissions_tonnes_co2e: fallbackResult.emissions_tonnes_co2e,
    curtailment_mwh: fallbackResult.curtailment_mwh,
    reliability_margin_percent: fallbackResult.reliability_margin_percent,
    engine_adapter_status: fallbackResult.engine_adapter?.status ?? null,
    solver: fallbackResult.engine_adapter?.solver ?? null,
    artifact_count: 0,
  },
]

const fallbackComparison: ScenarioComparison = {
  project_id: 'prj_nw_grid',
  scenario_count: 1,
  scenarios: [
    {
      scenario_id: fallbackResult.scenario_id,
      engine: fallbackResult.engine,
      total_cost_million: fallbackResult.total_cost_million,
      renewable_share_percent: fallbackResult.renewable_share_percent,
      emissions_tonnes_co2e: fallbackResult.emissions_tonnes_co2e,
      curtailment_mwh: fallbackResult.curtailment_mwh,
      reliability_margin_percent: fallbackResult.reliability_margin_percent,
      generation_mix: fallbackResult.generation_mix,
      cost_breakdown: fallbackResult.cost_breakdown,
    },
  ],
  indicators: {
    best_value_scenario_id: fallbackResult.scenario_id,
    lowest_emissions_scenario_id: fallbackResult.scenario_id,
    highest_renewable_scenario_id: fallbackResult.scenario_id,
    highest_risk_scenario_id: fallbackResult.scenario_id,
    summary:
      'scn_nw_base is currently the only completed scenario available for comparison.',
  },
}

const fallbackConnectors: DataConnector[] = [
  {
    id: 'open_meteo',
    name: 'Open-Meteo',
    coverage: 'Global',
    uses: ['forecast weather', 'solar radiation', 'wind speed'],
  },
  {
    id: 'nasa_power',
    name: 'NASA POWER',
    coverage: 'Global',
    uses: ['meteorology', 'solar radiation', 'climate data'],
  },
  {
    id: 'eia',
    name: 'EIA Open Data',
    coverage: 'United States',
    uses: ['electricity', 'generation', 'prices', 'capacity'],
  },
  {
    id: 'pvwatts',
    name: 'NREL PVWatts',
    coverage: 'Global where resource data is available',
    uses: ['quick PV production estimates'],
  },
]

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        'X-Request-ID': createRequestId(),
      },
    })

    if (!response.ok) {
      return fallback
    }

    return (await response.json()) as T
  } catch {
    return fallback
  }
}

async function postJson<TResponse, TPayload>(
  url: string,
  payload: TPayload,
): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': createRequestId(),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return (await response.json()) as TResponse
}

function createRequestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export async function getProjects(): Promise<Project[]> {
  const response = await getJson<ApiEnvelope<Project[]>>(
    `${platformApiUrl}/projects`,
    { data: fallbackProjects },
  )

  return response.data
}

export async function createProject(
  payload: CreateProjectPayload,
): Promise<Project> {
  const response = await postJson<ApiEnvelope<Project>, CreateProjectPayload>(
    `${platformApiUrl}/projects`,
    payload,
  )

  return response.data
}

export async function getProject(projectId: string): Promise<Project> {
  const fallbackProject =
    fallbackProjects.find((project) => project.id === projectId) ??
    fallbackProjects[0]

  const response = await getJson<ApiEnvelope<Project>>(
    `${platformApiUrl}/projects/${projectId}`,
    {
      data: {
        ...fallbackProject,
        scenarios: fallbackScenarios[projectId] ?? [],
      },
    },
  )

  return response.data
}

export async function createScenario(
  projectId: string,
  payload: CreateScenarioPayload,
): Promise<Scenario> {
  const response = await postJson<ApiEnvelope<Scenario>, CreateScenarioPayload>(
    `${platformApiUrl}/projects/${projectId}/scenarios`,
    payload,
  )

  return response.data
}

export async function getRecentSimulationJobs(): Promise<SimulationJob[]> {
  const response = await getJson<ApiEnvelope<SimulationJob[]>>(
    `${simulationApiUrl}/simulations/recent`,
    { data: fallbackJobs },
  )

  return response.data
}

export async function getDataConnectors(): Promise<DataConnector[]> {
  const response = await getJson<ApiEnvelope<DataConnector[]>>(
    `${simulationApiUrl}/data-connectors`,
    { data: fallbackConnectors },
  )

  return response.data
}

export async function getScenarioDatasets(
  projectId: string,
  scenarioId: string,
): Promise<ScenarioDataset[]> {
  const response = await getJson<ApiEnvelope<ScenarioDataset[]>>(
    `${simulationApiUrl}/projects/${projectId}/scenarios/${scenarioId}/datasets`,
    { data: [] },
  )

  return response.data
}

export async function importScenarioDataset(
  projectId: string,
  scenarioId: string,
  payload: ImportDatasetPayload,
): Promise<ScenarioDataset> {
  const response = await postJson<ApiEnvelope<ScenarioDataset>, ImportDatasetPayload>(
    `${simulationApiUrl}/projects/${projectId}/scenarios/${scenarioId}/datasets/import`,
    payload,
  )

  return response.data
}

export async function analyseScenario(
  payload: AssistantAnalysisPayload,
): Promise<AssistantAnalysis> {
  const response = await postJson<
    ApiEnvelope<AssistantAnalysis>,
    AssistantAnalysisPayload
  >(`${simulationApiUrl}/assistant/analyse`, payload)

  return response.data
}

export async function getScenarioComparison(
  projectId: string,
): Promise<ScenarioComparison> {
  const response = await getJson<ApiEnvelope<ScenarioComparison>>(
    `${simulationApiUrl}/projects/${projectId}/comparisons`,
    {
      data: {
        ...fallbackComparison,
        project_id: projectId,
      },
    },
  )

  return response.data
}

export async function submitSimulation(
  payload: SubmitSimulationPayload,
): Promise<SimulationJob> {
  return await postJson<SimulationJob, SubmitSimulationPayload>(
    `${simulationApiUrl}/simulations`,
    payload,
  )
}

export async function getLatestResult(
  projectId: string,
  scenarioId: string,
): Promise<SimulationResult | null> {
  const response = await getJson<ApiEnvelope<SimulationResult | null>>(
    `${simulationApiUrl}/projects/${projectId}/scenarios/${scenarioId}/results/latest`,
    {
      data:
        projectId === 'prj_nw_grid' && scenarioId === 'scn_nw_base'
          ? fallbackResult
          : null,
    },
  )

  return response.data
}

export async function getScenarioResultHistory(
  projectId: string,
  scenarioId: string,
): Promise<SimulationResultHistoryItem[]> {
  const response = await getJson<ApiEnvelope<SimulationResultHistoryItem[]>>(
    `${simulationApiUrl}/projects/${projectId}/scenarios/${scenarioId}/results`,
    {
      data:
        projectId === 'prj_nw_grid' && scenarioId === 'scn_nw_base'
          ? fallbackResultHistory
          : [],
    },
  )

  return response.data
}

export async function getPlatformOperationsStatus(): Promise<ServiceOperationsStatus> {
  const response = await getJson<ApiEnvelope<ServiceOperationsStatus>>(
    `${platformApiUrl}/operations/status`,
    {
      data: {
        service: 'loadpath-meridian-platform',
        status: 'degraded',
        environment: 'unknown',
        checks: {
          database: 'unavailable',
        },
        request_id_header: 'X-Request-ID',
      },
    },
  )

  return response.data
}

export async function getSimulationOperationsStatus(): Promise<ServiceOperationsStatus> {
  const response = await getJson<ApiEnvelope<ServiceOperationsStatus>>(
    `${simulationApiUrl}/operations/status`,
    {
      data: {
        service: 'loadpath-meridian-simulation',
        status: 'degraded',
        environment: 'unknown',
        checks: {
          database: 'unavailable',
          redis: 'unavailable',
          worker: 'unavailable',
        },
        queue: {
          mode: 'unknown',
          counts: {},
        },
        request_id_header: 'X-Request-ID',
      },
    },
  )

  return response.data
}
