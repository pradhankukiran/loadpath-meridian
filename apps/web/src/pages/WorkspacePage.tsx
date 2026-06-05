import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  analyseScenario,
  getLatestResult,
  getProject,
  getProjects,
  getRecentSimulationJobs,
  getScenarioResultHistory,
  getDataConnectors,
  getScenarioDatasets,
  importScenarioDataset,
  type AssistantAnalysis,
  type DataConnector,
  type Project,
  type ScenarioDataset,
  type SimulationJob,
  type SimulationResult,
  type SimulationResultHistoryItem,
} from '../api'
import {
  formatDateTime,
  formatNumber,
  formatOptionalNumber,
  formatOptionalPercent,
  formatPercent,
} from '../lib/format'

const defaultDataImportForm = {
  location_label: 'Manchester grid node',
  latitude: '53.48',
  longitude: '-2.24',
  forecast_days: '7',
}

const assistantPrompts = [
  'Explain this result for a project sponsor.',
  'What assumptions look weak?',
  'How can we reduce curtailment?',
  'Summarise the operational risks.',
]

function maxOf(values: number[]) {
  return Math.max(...values, 1)
}

function resourceLabel(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function resourceValue(value: number | string) {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? formatNumber(value) : value.toFixed(2)
  }

  return value
}

function artifactCount(
  model?: Record<
    string,
    number | string | null | Array<Record<string, number | string>>
  >,
) {
  const artifacts = model?.artifacts
  return Array.isArray(artifacts) ? artifacts.length : 0
}

export function WorkspacePage() {
  const { projectId: routeProjectId = '' } = useParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [projectDetail, setProjectDetail] = useState<Project | null>(null)
  const [jobs, setJobs] = useState<SimulationJob[]>([])
  const [latestResult, setLatestResult] = useState<SimulationResult | null>(null)
  const [resultHistory, setResultHistory] = useState<
    SimulationResultHistoryItem[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [workspaceStatus, setWorkspaceStatus] = useState('')
  const [connectors, setConnectors] = useState<DataConnector[]>([])
  const [datasets, setDatasets] = useState<ScenarioDataset[]>([])
  const [dataImportForm, setDataImportForm] = useState(defaultDataImportForm)
  const [dataImportStatus, setDataImportStatus] = useState<string>('')
  const [isImportingData, setIsImportingData] = useState(false)
  const [assistantMessage, setAssistantMessage] = useState(assistantPrompts[0])
  const [assistantResponse, setAssistantResponse] =
    useState<AssistantAnalysis | null>(null)
  const [isAssistantLoading, setIsAssistantLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadWorkspace() {
      try {
        const [projectData, jobData, connectorData] = await Promise.all([
          getProjects(),
          getRecentSimulationJobs(),
          getDataConnectors(),
        ])

        if (!isMounted) {
          return
        }

        setProjects(projectData)
        setJobs(jobData)
        setConnectors(connectorData)
        setSelectedProjectId(
          (current) => routeProjectId || current || projectData[0]?.id || '',
        )
        setWorkspaceStatus('')
      } catch {
        if (isMounted) {
          setWorkspaceStatus('Could not load workspace data')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadWorkspace()

    return () => {
      isMounted = false
    }
  }, [routeProjectId])

  useEffect(() => {
    if (!selectedProjectId) {
      return
    }

    let isMounted = true

    async function loadProject() {
      try {
        const detail = await getProject(selectedProjectId)

        if (!isMounted) {
          return
        }

        setProjectDetail(detail)
      } catch {
        if (isMounted) {
          setProjectDetail(null)
          setWorkspaceStatus('Could not load selected project')
        }
      }
    }

    loadProject()

    return () => {
      isMounted = false
    }
  }, [selectedProjectId])

  const scenarios = projectDetail?.scenarios ?? []
  const selectedScenario = scenarios[0] ?? null
  const selectedScenarioResultId = selectedScenario?.id ?? ''

  useEffect(() => {
    let isMounted = true

    async function loadScenarioResults() {
      try {
        const [result, history] =
          selectedProjectId && selectedScenario
            ? await Promise.all([
                getLatestResult(selectedProjectId, selectedScenarioResultId),
                getScenarioResultHistory(
                  selectedProjectId,
                  selectedScenarioResultId,
                ),
              ])
            : [null, []]

        if (!isMounted) {
          return
        }

        setLatestResult(result)
        setResultHistory(history)
      } catch {
        if (isMounted) {
          setLatestResult(null)
          setResultHistory([])
        }
      }
    }

    loadScenarioResults()

    return () => {
      isMounted = false
    }
  }, [selectedProjectId, selectedScenario, selectedScenarioResultId])

  useEffect(() => {
    let isMounted = true

    async function loadDatasets() {
      try {
        const data =
          selectedProjectId && selectedScenarioResultId
            ? await getScenarioDatasets(selectedProjectId, selectedScenarioResultId)
            : []

        if (!isMounted) {
          return
        }

        setDatasets(data)
      } catch {
        if (isMounted) {
          setDatasets([])
        }
      }
    }

    loadDatasets()

    return () => {
      isMounted = false
    }
  }, [selectedProjectId, selectedScenarioResultId])

  const activeProjectCount = projects.filter(
    (project) => project.status === 'active',
  ).length

  const scenarioCount = projects.reduce(
    (total, project) => total + (project.scenarios_count ?? 0),
    0,
  )

  const completedJobCount = jobs.filter((job) => job.status === 'complete').length

  const selectedProjectName = useMemo(() => {
    return (
      projects.find((project) => project.id === selectedProjectId)?.name ??
      'Selected project'
    )
  }, [projects, selectedProjectId])

  const selectedScenarioJobs = jobs.filter(
    (job) =>
      job.project_id === selectedProjectId &&
      job.scenario_id === selectedScenarioResultId,
  )

  async function handleDataImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedProjectId || !selectedScenario) {
      return
    }

    setIsImportingData(true)
    setDataImportStatus('Importing Open-Meteo data')

    try {
      await importScenarioDataset(selectedProjectId, selectedScenario.id, {
        source: 'open_meteo',
        location_label: dataImportForm.location_label,
        latitude: Number(dataImportForm.latitude),
        longitude: Number(dataImportForm.longitude),
        forecast_days: Number(dataImportForm.forecast_days),
      })

      const updatedDatasets = await getScenarioDatasets(
        selectedProjectId,
        selectedScenario.id,
      )
      setDatasets(updatedDatasets)
      setDataImportStatus('Imported weather inputs')
    } catch {
      setDataImportStatus('Could not import weather inputs')
    } finally {
      setIsImportingData(false)
    }
  }

  async function handleAssistantSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    if (!selectedProjectId || !selectedScenario) {
      return
    }

    setIsAssistantLoading(true)

    try {
      const response = await analyseScenario({
        project_id: selectedProjectId,
        scenario_id: selectedScenario.id,
        message: assistantMessage,
        context_scope: 'latest_result',
      })
      setAssistantResponse(response)
    } catch {
      setAssistantResponse({
        source: 'local',
        analysis: 'The assistant could not analyse this scenario right now.',
        context: {
          project_id: selectedProjectId,
          scenario_id: selectedScenario.id,
          message: assistantMessage,
          latest_result: null,
          latest_dataset_summary: null,
        },
      })
    } finally {
      setIsAssistantLoading(false)
    }
  }

  return (
    <>
        <section className="page-heading">
          <span className="caption">Workspace</span>
          <h1>Energy systems command centre</h1>
          <p>
            Configure projects, run cloud simulations, compare scenarios, and
            explain results with the Modal-backed assistant.
          </p>
          <div className="actions">
            <Link to="/projects/new">Create project</Link>
            <Link
              to={
                selectedProjectId
                  ? `/projects/${selectedProjectId}/scenarios/new`
                  : '/projects'
              }
            >
              Configure simulation
            </Link>
          </div>
        </section>

        <section className="summary-grid" aria-label="Platform summary">
          <div className="summary-item">
            <span>Active projects</span>
            <strong>{isLoading ? '-' : activeProjectCount}</strong>
          </div>
          <div className="summary-item">
            <span>Simulation jobs</span>
            <strong>{isLoading ? '-' : jobs.length}</strong>
          </div>
          <div className="summary-item">
            <span>Scenarios</span>
            <strong>{isLoading ? '-' : scenarioCount}</strong>
          </div>
          <div className="summary-item">
            <span>Completed jobs</span>
            <strong>{isLoading ? '-' : completedJobCount}</strong>
          </div>
        </section>

        {workspaceStatus ? (
          <section className="decision-panel">
            <h2>Workspace unavailable</h2>
            <p>{workspaceStatus}</p>
          </section>
        ) : null}

        <section className="two-column">
          <div>
            <div className="section-heading">
              <h2>Projects</h2>
              <Link to="/projects">View all</Link>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Project</th>
                    <th scope="col">Owner</th>
                    <th scope="col">Region</th>
                    <th scope="col">Scenarios</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <th scope="row">
                        <Link to={`/projects/${project.id}`}>{project.name}</Link>
                      </th>
                      <td>{project.owner}</td>
                      <td>{project.region}</td>
                      <td>{project.scenarios_count ?? 0}</td>
                      <td>
                        <span className={`tag tag-${project.status}`}>
                          {project.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="queue" aria-label="Simulation queue">
            <div className="section-heading">
              <h2>Simulation queue</h2>
              <Link to="/simulations">Manage</Link>
            </div>
            <ol>
              {jobs.slice(0, 5).map((job) => (
                <li key={job.id}>
                  <div>
                    <strong>{job.id}</strong>
                    <span>{job.model}</span>
                    <small>
                      {job.project_id} / {job.scenario_id}
                    </small>
                    <div
                      className="progress-track"
                      aria-label={`${job.id} progress ${job.progress}%`}
                    >
                      <span
                        className="progress-fill"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <small>
                      {job.progress}% complete · submitted{' '}
                      {formatDateTime(job.submitted_at)}
                    </small>
                    {job.error_message ? (
                      <small className="error-copy">{job.error_message}</small>
                    ) : null}
                  </div>
                  <span className={`tag tag-${job.status}`}>{job.status}</span>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        <section className="workspace-panel" aria-labelledby="project-workspace">
          <span className="caption">Project workspace</span>
          <h2 id="project-workspace">{selectedProjectName}</h2>
          {projectDetail ? (
            <>
              <dl className="summary-list">
                <div>
                  <dt>Region</dt>
                  <dd>{projectDetail.region}</dd>
                </div>
                <div>
                  <dt>Grid region</dt>
                  <dd>{projectDetail.grid_region}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{projectDetail.description}</dd>
                </div>
              </dl>

              <div className="scenario-grid">
                <div>
                  <section className="data-panel" aria-labelledby="data-import">
                    <div className="section-heading">
                      <h2 id="data-import">Scenario data</h2>
                      <span className="status-message">
                        {connectors.length} connectors
                      </span>
                    </div>
                    <div className="connector-list" aria-label="Data connectors">
                      {connectors.slice(0, 4).map((connector) => (
                        <div className="connector-item" key={connector.id}>
                          <strong>{connector.name}</strong>
                          <span>{connector.coverage}</span>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleDataImport}>
                      <div className="form-grid compact-form-grid">
                        <label>
                          <span>Location label</span>
                          <input
                            value={dataImportForm.location_label}
                            onChange={(event) =>
                              setDataImportForm({
                                ...dataImportForm,
                                location_label: event.target.value,
                              })
                            }
                            required
                          />
                        </label>
                        <label>
                          <span>Forecast days</span>
                          <input
                            type="number"
                            min="1"
                            max="16"
                            value={dataImportForm.forecast_days}
                            onChange={(event) =>
                              setDataImportForm({
                                ...dataImportForm,
                                forecast_days: event.target.value,
                              })
                            }
                            required
                          />
                        </label>
                        <label>
                          <span>Latitude</span>
                          <input
                            type="number"
                            step="0.0001"
                            value={dataImportForm.latitude}
                            onChange={(event) =>
                              setDataImportForm({
                                ...dataImportForm,
                                latitude: event.target.value,
                              })
                            }
                            required
                          />
                        </label>
                        <label>
                          <span>Longitude</span>
                          <input
                            type="number"
                            step="0.0001"
                            value={dataImportForm.longitude}
                            onChange={(event) =>
                              setDataImportForm({
                                ...dataImportForm,
                                longitude: event.target.value,
                              })
                            }
                            required
                          />
                        </label>
                      </div>
                      <div className="form-actions">
                        <button type="submit" disabled={isImportingData}>
                          {isImportingData
                            ? 'Importing'
                            : 'Import Open-Meteo data'}
                        </button>
                        {dataImportStatus ? (
                          <span className="status-message">
                            {dataImportStatus}
                          </span>
                        ) : null}
                      </div>
                    </form>
                    {datasets.length ? (
                      <dl className="dataset-summary">
                        <div>
                          <dt>Latest dataset</dt>
                          <dd>{datasets[0].name}</dd>
                        </div>
                        <div>
                          <dt>Location</dt>
                          <dd>{datasets[0].location.label}</dd>
                        </div>
                        <div>
                          <dt>Records</dt>
                          <dd>{formatNumber(datasets[0].summary.records)}</dd>
                        </div>
                        <div>
                          <dt>Mean wind</dt>
                          <dd>
                            {datasets[0].summary.wind_speed_10m_mean_kmh} km/h
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="small-copy">
                        No imported datasets for the selected scenario.
                      </p>
                    )}
                  </section>

                  <div className="section-heading">
                    <h2>Scenarios</h2>
                    <Link
                      to={
                        selectedProjectId
                          ? `/projects/${selectedProjectId}/scenarios/new`
                          : '/projects'
                      }
                    >
                      Create scenario
                    </Link>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Scenario</th>
                          <th scope="col">Engine</th>
                          <th scope="col">Horizon</th>
                          <th scope="col">Peak load</th>
                          <th scope="col">Target</th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(projectDetail.scenarios ?? []).map((scenario) => (
                          <tr key={scenario.id}>
                            <th scope="row">
                              <Link
                                to={`/projects/${projectDetail.id}/scenarios/${scenario.id}`}
                              >
                                {scenario.name}
                              </Link>
                            </th>
                            <td>{scenario.engine}</td>
                            <td>{scenario.horizon}</td>
                            <td>{formatNumber(scenario.peak_load_mw)} MW</td>
                            <td>
                              {formatPercent(scenario.renewable_share_target)}
                            </td>
                            <td>
                              <span className={`tag tag-${scenario.status}`}>
                                {scenario.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <aside className="result-panel">
                  <h2>Latest result</h2>
                  {selectedScenarioJobs.length ? (
                    <div className="scenario-run-state">
                      <h3>Selected scenario jobs</h3>
                      <ol>
                        {selectedScenarioJobs.slice(0, 3).map((job) => (
                          <li key={job.id}>
                            <div>
                              <strong>{job.id}</strong>
                              <small>
                                {job.progress}% · {formatDateTime(job.submitted_at)}
                              </small>
                              <div className="progress-track">
                                <span
                                  className="progress-fill"
                                  style={{ width: `${job.progress}%` }}
                                />
                              </div>
                            </div>
                            <span className={`tag tag-${job.status}`}>
                              {job.status}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                  {latestResult ? (
                    <>
                      <dl className="result-metrics">
                        <div>
                          <dt>Total cost</dt>
                          <dd>£{latestResult.total_cost_million}m</dd>
                        </div>
                        <div>
                          <dt>Renewable share</dt>
                          <dd>
                            {formatPercent(latestResult.renewable_share_percent)}
                          </dd>
                        </div>
                        <div>
                          <dt>Emissions</dt>
                          <dd>
                            {formatNumber(
                              latestResult.emissions_tonnes_co2e,
                            )}{' '}
                            tCO2e
                          </dd>
                        </div>
                        <div>
                          <dt>Reliability margin</dt>
                          <dd>
                            {formatPercent(
                              latestResult.reliability_margin_percent,
                            )}
                          </dd>
                        </div>
                      </dl>
                      {latestResult.engine_adapter ? (
                        <div className="engine-adapter">
                          <h3>Engine execution</h3>
                          <p>
                            <span
                              className={`tag tag-${latestResult.engine_adapter.status}`}
                            >
                              {latestResult.engine_adapter.status.replace('_', ' ')}
                            </span>
                          </p>
                          <dl className="input-summary">
                            <div>
                              <dt>Adapter</dt>
                              <dd>{latestResult.engine_adapter.engine}</dd>
                            </div>
                            {latestResult.engine_adapter.library ? (
                              <div>
                                <dt>Library</dt>
                                <dd>
                                  {latestResult.engine_adapter.library}
                                  {latestResult.engine_adapter.library_version
                                    ? ` ${latestResult.engine_adapter.library_version}`
                                    : ''}
                                </dd>
                              </div>
                            ) : null}
                            {latestResult.engine_adapter.solver ? (
                              <div>
                                <dt>Solver</dt>
                                <dd>{latestResult.engine_adapter.solver}</dd>
                              </div>
                            ) : null}
                            {artifactCount(latestResult.engine_adapter.model) > 0 ? (
                              <div>
                                <dt>Artifacts</dt>
                                <dd>
                                  {artifactCount(latestResult.engine_adapter.model)}
                                </dd>
                              </div>
                            ) : null}
                          </dl>
                          <p>{latestResult.engine_adapter.message}</p>
                        </div>
                      ) : null}
                      {latestResult.engine_resource_summary ? (
                        <>
                          <h3>Engine resource</h3>
                          <dl className="input-summary">
                            {Object.entries(
                              latestResult.engine_resource_summary,
                            ).map(([key, value]) => (
                              <div key={key}>
                                <dt>{resourceLabel(key)}</dt>
                                <dd>{resourceValue(value)}</dd>
                              </div>
                            ))}
                          </dl>
                        </>
                      ) : null}
                      {latestResult.input_data_summary ? (
                        <>
                          <h3>Input data used</h3>
                          <dl className="input-summary">
                            <div>
                              <dt>Records</dt>
                              <dd>
                                {formatNumber(
                                  latestResult.input_data_summary.records,
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt>Mean temperature</dt>
                              <dd>
                                {
                                  latestResult.input_data_summary
                                    .temperature_2m_mean_c
                                }
                                °C
                              </dd>
                            </div>
                            <div>
                              <dt>Mean wind</dt>
                              <dd>
                                {
                                  latestResult.input_data_summary
                                    .wind_speed_10m_mean_kmh
                                }{' '}
                                km/h
                              </dd>
                            </div>
                            <div>
                              <dt>Mean shortwave</dt>
                              <dd>
                                {
                                  latestResult.input_data_summary
                                    .shortwave_radiation_mean_wm2
                                }{' '}
                                W/m2
                              </dd>
                            </div>
                          </dl>
                        </>
                      ) : null}
                      {resultHistory.length ? (
                        <>
                          <h3>Result history</h3>
                          <div className="history-list">
                            {resultHistory.slice(0, 5).map((run) => (
                              <article key={run.job_id}>
                                <div className="history-row-heading">
                                  <strong>{run.job_id}</strong>
                                  <span className={`tag tag-${run.status}`}>
                                    {run.status}
                                  </span>
                                </div>
                                <dl>
                                  <div>
                                    <dt>Completed</dt>
                                    <dd>{formatDateTime(run.completed_at)}</dd>
                                  </div>
                                  <div>
                                    <dt>Adapter</dt>
                                    <dd>
                                      {run.engine_adapter_status ? (
                                        <span
                                          className={`tag tag-${run.engine_adapter_status}`}
                                        >
                                          {run.engine_adapter_status.replace(
                                            '_',
                                            ' ',
                                          )}
                                        </span>
                                      ) : (
                                        '-'
                                      )}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Solver</dt>
                                    <dd>{run.solver ?? '-'}</dd>
                                  </div>
                                  <div>
                                    <dt>Artifacts</dt>
                                    <dd>{run.artifact_count}</dd>
                                  </div>
                                  <div>
                                    <dt>Cost</dt>
                                    <dd>£{formatOptionalNumber(run.total_cost_million)}m</dd>
                                  </div>
                                  <div>
                                    <dt>Renewables</dt>
                                    <dd>
                                      {formatOptionalPercent(
                                        run.renewable_share_percent,
                                      )}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Emissions</dt>
                                    <dd>
                                      {formatOptionalNumber(
                                        run.emissions_tonnes_co2e,
                                      )}{' '}
                                      tCO2e
                                    </dd>
                                  </div>
                                </dl>
                              </article>
                            ))}
                          </div>
                        </>
                      ) : null}
                      <h3>Generation mix</h3>
                      <div className="result-bars">
                        {latestResult.generation_mix.map((item) => {
                          const maxGeneration = maxOf(
                            latestResult.generation_mix.map((mix) => mix.mwh),
                          )

                          return (
                            <div className="result-bar-row" key={item.label}>
                              <div className="result-bar-label">
                                <span>{item.label}</span>
                                <strong>{formatNumber(Math.round(item.mwh))} MWh</strong>
                              </div>
                              <div className="result-bar-track">
                                <div
                                  className="result-bar-fill"
                                  style={{
                                    width: `${Math.max(5, (item.mwh / maxGeneration) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <h3>Cost breakdown</h3>
                      <div className="result-bars">
                        {latestResult.cost_breakdown.map((item) => {
                          const maxCost = maxOf(
                            latestResult.cost_breakdown.map((cost) => cost.million),
                          )

                          return (
                            <div className="result-bar-row" key={item.label}>
                              <div className="result-bar-label">
                                <span>{item.label}</span>
                                <strong>£{item.million}m</strong>
                              </div>
                              <div className="result-bar-track">
                                <div
                                  className="result-bar-fill result-bar-fill-cost"
                                  style={{
                                    width: `${Math.max(5, (item.million / maxCost) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <h3>Dispatch sample</h3>
                      <div className="dispatch-table-wrap">
                        <table className="dispatch-table">
                          <thead>
                            <tr>
                              <th scope="col">Hour</th>
                              <th scope="col">Demand</th>
                              <th scope="col">Solar</th>
                              <th scope="col">Wind</th>
                              <th scope="col">Grid</th>
                            </tr>
                          </thead>
                          <tbody>
                            {latestResult.dispatch_profile
                              .filter((row) => row.hour % 4 === 0)
                              .map((row) => (
                                <tr key={row.hour}>
                                  <th scope="row">{row.hour}:00</th>
                                  <td>{Math.round(row.demand_mw)}</td>
                                  <td>{Math.round(row.solar_mw)}</td>
                                  <td>{Math.round(row.wind_mw)}</td>
                                  <td>{Math.round(row.grid_mw)}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      <h3>Assistant-ready notes</h3>
                      <ul>
                        {latestResult.recommendations.map((recommendation) => (
                          <li key={recommendation}>{recommendation}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p>No completed result is available for this scenario yet.</p>
                  )}
                </aside>

                <aside className="assistant-panel" aria-labelledby="assistant-panel">
                  <h2 id="assistant-panel">Assistant</h2>
                  <form onSubmit={handleAssistantSubmit}>
                    <label>
                      <span>Question</span>
                      <textarea
                        value={assistantMessage}
                        onChange={(event) =>
                          setAssistantMessage(event.target.value)
                        }
                        rows={4}
                      />
                    </label>
                    <div className="prompt-list" aria-label="Suggested prompts">
                      {assistantPrompts.map((prompt) => (
                        <button
                          className="secondary-button"
                          type="button"
                          key={prompt}
                          onClick={() => setAssistantMessage(prompt)}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                    <div className="form-actions">
                      <button type="submit" disabled={isAssistantLoading}>
                        {isAssistantLoading ? 'Analysing' : 'Ask assistant'}
                      </button>
                      {assistantResponse ? (
                        <span className={`tag tag-${assistantResponse.source}`}>
                          {assistantResponse.source}
                        </span>
                      ) : null}
                    </div>
                  </form>
                  {assistantResponse ? (
                    <div className="assistant-response">
                      <h3>Analysis</h3>
                      <p>{assistantResponse.analysis}</p>
                    </div>
                  ) : (
                    <p className="small-copy">
                      Ask for an explanation, assumption review, or scenario
                      improvement ideas.
                    </p>
                  )}
                </aside>
              </div>
            </>
          ) : (
            <p>Loading project workspace.</p>
          )}
        </section>
    </>
  )
}
