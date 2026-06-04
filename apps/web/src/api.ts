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
}

export type SimulationResult = {
  scenario_id: string
  status: string
  engine: string
  total_cost_million: number
  renewable_share_percent: number
  emissions_tonnes_co2e: number
  curtailment_mwh: number
  reliability_margin_percent: number
  recommendations: string[]
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
  recommendations: [
    'Increase short-duration storage before adding new peaking generation.',
    'Test a tighter grid import constraint against winter peak demand.',
    'Review curtailment around high-wind overnight periods.',
  ],
}

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url)

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
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return (await response.json()) as TResponse
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
