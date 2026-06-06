import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getLatestResult,
  getProject,
  getScenarioDatasets,
  getScenarioResultHistory,
  getScenarioSimulationJobs,
  type Project,
  type Scenario,
  type ScenarioDataset,
  type SimulationJob,
  type SimulationResult,
  type SimulationResultHistoryItem,
} from '../api'
import { formatDateTime, formatNumber, formatPercent } from '../lib/format'

export function ScenarioDetailPage() {
  const { projectId = '', scenarioId = '' } = useParams()
  const routeIsIncomplete = !projectId || !scenarioId
  const [project, setProject] = useState<Project | null>(null)
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [latestResult, setLatestResult] = useState<SimulationResult | null>(null)
  const [history, setHistory] = useState<SimulationResultHistoryItem[]>([])
  const [jobs, setJobs] = useState<SimulationJob[]>([])
  const [datasets, setDatasets] = useState<ScenarioDataset[]>([])
  const [loadStatus, setLoadStatus] = useState('Loading scenario')

  useEffect(() => {
    if (routeIsIncomplete) {
      return
    }

    let isMounted = true

    async function loadScenario(showLoadingState = false) {
      if (showLoadingState) {
        setLoadStatus('Loading scenario')
      }

      try {
        const [projectData, resultData, historyData, jobData, datasetData] =
          await Promise.all([
            getProject(projectId),
            getLatestResult(projectId, scenarioId),
            getScenarioResultHistory(projectId, scenarioId),
            getScenarioSimulationJobs(projectId, scenarioId),
            getScenarioDatasets(projectId, scenarioId),
          ])

        if (!isMounted) {
          return
        }

        const matchingScenario =
          projectData.scenarios?.find((item) => item.id === scenarioId) ?? null

        setProject(projectData)
        setScenario(matchingScenario)
        setLatestResult(resultData)
        setHistory(historyData)
        setJobs(jobData)
        setDatasets(datasetData)
        setLoadStatus(
          matchingScenario ? '' : 'Scenario was not found in this project',
        )
      } catch {
        if (isMounted) {
          setLoadStatus('Could not load scenario')
        }
      }
    }

    loadScenario(true)

    const intervalId = window.setInterval(() => {
      loadScenario()
    }, 3500)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [projectId, routeIsIncomplete, scenarioId])

  if (routeIsIncomplete || loadStatus) {
    return (
      <section className="page-heading">
        <span className="caption">Scenario</span>
        <h1>{routeIsIncomplete ? 'Scenario route is incomplete' : loadStatus}</h1>
        <div className="actions">
          <Link to={`/projects/${projectId}`}>Back to project</Link>
        </div>
      </section>
    )
  }

  if (!project || !scenario) {
    return null
  }

  const latestJob = jobs[0] ?? null
  const latestJobIsActive =
    latestJob?.status === 'queued' || latestJob?.status === 'running'

  return (
    <>
      <section className="page-heading">
        <span className="caption">{project.name}</span>
        <h1>{scenario.name}</h1>
        <p>{scenario.objective}</p>
        <div className="actions">
          <Link to={`/projects/${project.id}`}>Open project</Link>
          <Link to={`/projects/${project.id}/reports`}>Open reports</Link>
        </div>
      </section>

      <section className="summary-grid" aria-label="Scenario summary">
        <div className="summary-item">
          <span>Engine</span>
          <strong>{scenario.engine}</strong>
        </div>
        <div className="summary-item">
          <span>Horizon</span>
          <strong>{scenario.horizon}</strong>
        </div>
        <div className="summary-item">
          <span>Peak load</span>
          <strong>{formatNumber(scenario.peak_load_mw)} MW</strong>
        </div>
        <div className="summary-item">
          <span>{latestJob ? 'Latest run' : 'Scenario state'}</span>
          <strong>{latestJob?.status ?? scenario.status}</strong>
        </div>
      </section>

      {latestJob ? (
        <section className="result-panel scenario-job-panel">
          <h2>Simulation run</h2>
          <div className="job-status-line">
            <span className={`tag tag-${latestJob.status}`}>
              {latestJob.status}
            </span>
            <strong>{latestJob.model}</strong>
          </div>
          <div className="progress-track">
            <span
              className="progress-fill"
              style={{ width: `${latestJob.progress}%` }}
            />
          </div>
          <p>
            {latestJobIsActive
              ? 'The run is being processed. This page refreshes automatically.'
              : latestJob.status === 'complete'
                ? 'The latest run has completed and the result summary is available below.'
                : 'The latest run did not complete. Review the error message and submit another scenario run.'}
          </p>
          <dl className="input-summary">
            <div>
              <dt>Job</dt>
              <dd>{latestJob.id}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>{formatDateTime(latestJob.submitted_at)}</dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd>{latestJob.started_at ? formatDateTime(latestJob.started_at) : '-'}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>
                {latestJob.completed_at
                  ? formatDateTime(latestJob.completed_at)
                  : '-'}
              </dd>
            </div>
          </dl>
          {latestJob.error_message ? (
            <p className="error-copy">{latestJob.error_message}</p>
          ) : null}
        </section>
      ) : null}

      {latestResult ? (
        <section className="report-summary-grid" aria-label="Latest result">
          <div>
            <span>Total cost</span>
            <strong>£{latestResult.total_cost_million}m</strong>
          </div>
          <div>
            <span>Renewable share</span>
            <strong>{formatPercent(latestResult.renewable_share_percent)}</strong>
          </div>
          <div>
            <span>Emissions</span>
            <strong>
              {formatNumber(latestResult.emissions_tonnes_co2e)} tCO2e
            </strong>
          </div>
          <div>
            <span>Reliability margin</span>
            <strong>
              {formatPercent(latestResult.reliability_margin_percent)}
            </strong>
          </div>
        </section>
      ) : (
        <section className="decision-panel">
          <h2>
            {latestJobIsActive ? 'Result pending' : 'No completed result'}
          </h2>
          <p>
            {latestJobIsActive
              ? 'The simulation has been accepted by the queue. Result metrics will appear here as soon as the worker finishes.'
              : 'This scenario has not produced a completed simulation result yet.'}
          </p>
        </section>
      )}

      <div className="section-heading">
        <h2>Run history</h2>
        <Link to={`/projects/${project.id}/scenarios/new`}>
          Create another scenario
        </Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Job</th>
              <th scope="col">Engine</th>
              <th scope="col">Status</th>
              <th scope="col">Submitted</th>
              <th scope="col">Completed</th>
              <th scope="col">Cost</th>
            </tr>
          </thead>
          <tbody>
            {history.length ? (
              history.map((item) => (
                <tr key={item.job_id}>
                  <th scope="row">{item.job_id}</th>
                  <td>{item.engine}</td>
                  <td>
                    <span className={`tag tag-${item.status}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{formatDateTime(item.submitted_at)}</td>
                  <td>{formatDateTime(item.completed_at)}</td>
                  <td>
                    {item.total_cost_million == null
                      ? '-'
                      : `£${item.total_cost_million}m`}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>No simulation jobs have run for this scenario.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="data-panel" aria-labelledby="scenario-datasets">
        <h2 id="scenario-datasets">Imported datasets</h2>
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
              <dd>{datasets[0].summary.wind_speed_10m_mean_kmh ?? '-'} km/h</dd>
            </div>
          </dl>
        ) : (
          <p>No imported datasets are attached to this scenario.</p>
        )}
      </section>
    </>
  )
}
