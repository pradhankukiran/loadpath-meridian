import { useEffect, useMemo, useState } from 'react'
import {
  getLatestResult,
  getProject,
  getProjects,
  getRecentSimulationJobs,
  type Project,
  type SimulationJob,
  type SimulationResult,
} from './api'
import './App.css'

function formatNumber(value: number) {
  return new Intl.NumberFormat('en').format(value)
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [projectDetail, setProjectDetail] = useState<Project | null>(null)
  const [jobs, setJobs] = useState<SimulationJob[]>([])
  const [latestResult, setLatestResult] = useState<SimulationResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadWorkspace() {
      const [projectData, jobData] = await Promise.all([
        getProjects(),
        getRecentSimulationJobs(),
      ])

      if (!isMounted) {
        return
      }

      setProjects(projectData)
      setJobs(jobData)
      setSelectedProjectId((current) => current || projectData[0]?.id || '')
      setIsLoading(false)
    }

    loadWorkspace()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedProjectId) {
      return
    }

    let isMounted = true

    async function loadProject() {
      const detail = await getProject(selectedProjectId)

      if (!isMounted) {
        return
      }

      setProjectDetail(detail)
    }

    loadProject()

    return () => {
      isMounted = false
    }
  }, [selectedProjectId])

  const selectedScenario = projectDetail?.scenarios?.[0] ?? null

  useEffect(() => {
    if (!selectedProjectId || !selectedScenario) {
      setLatestResult(null)
      return
    }

    let isMounted = true
    const scenarioId = selectedScenario.id

    async function loadLatestResult() {
      const result = await getLatestResult(selectedProjectId, scenarioId)

      if (!isMounted) {
        return
      }

      setLatestResult(result)
    }

    loadLatestResult()

    return () => {
      isMounted = false
    }
  }, [selectedProjectId, selectedScenario])

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

  return (
    <div className="app-shell">
      <header className="service-header">
        <div className="container header-inner">
          <a className="brand" href="/">
            Loadpath Meridian
          </a>
          <nav aria-label="Primary navigation">
            <a href="/projects">Projects</a>
            <a href="/simulations">Simulations</a>
            <a href="/data-sources">Data sources</a>
            <a href="/reports">Reports</a>
          </nav>
        </div>
      </header>

      <main className="container main-content">
        <div className="phase-banner">
          <strong>Private beta</strong>
          <span>
            Energy infrastructure modelling, simulation, and scenario planning.
          </span>
        </div>

        <section className="page-heading">
          <span className="caption">Workspace</span>
          <h1>Energy systems command centre</h1>
          <p>
            Configure projects, run cloud simulations, compare scenarios, and
            explain results with the Modal-backed assistant.
          </p>
          <div className="actions">
            <button type="button">Create project</button>
            <a href="/simulations/new">Configure simulation</a>
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

        <section className="two-column">
          <div>
            <div className="section-heading">
              <h2>Projects</h2>
              <a href="/projects">View all</a>
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
                        <button
                          className="link-button"
                          type="button"
                          onClick={() => setSelectedProjectId(project.id)}
                        >
                          {project.name}
                        </button>
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
              <a href="/simulations">Manage</a>
            </div>
            <ol>
              {jobs.map((job) => (
                <li key={job.id}>
                  <div>
                    <strong>{job.id}</strong>
                    <span>{job.model}</span>
                    <small>{job.progress}% complete</small>
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
                  <div className="section-heading">
                    <h2>Scenarios</h2>
                    <button type="button">Add scenario</button>
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
                            <th scope="row">{scenario.name}</th>
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
              </div>
            </>
          ) : (
            <p>Loading project workspace.</p>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
