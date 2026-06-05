import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getLatestResult,
  getProject,
  getScenarioDatasets,
  getScenarioResultHistory,
  type Project,
  type Scenario,
  type ScenarioDataset,
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
  const [datasets, setDatasets] = useState<ScenarioDataset[]>([])
  const [loadStatus, setLoadStatus] = useState('Loading scenario')

  useEffect(() => {
    if (routeIsIncomplete) {
      return
    }

    let isMounted = true

    async function loadScenario() {
      setLoadStatus('Loading scenario')

      try {
        const [projectData, resultData, historyData, datasetData] =
          await Promise.all([
            getProject(projectId),
            getLatestResult(projectId, scenarioId),
            getScenarioResultHistory(projectId, scenarioId),
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

    loadScenario()

    return () => {
      isMounted = false
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

  return (
    <>
      <section className="page-heading">
        <span className="caption">{project.name}</span>
        <h1>{scenario.name}</h1>
        <p>{scenario.objective}</p>
        <div className="actions">
          <Link to={`/projects/${project.id}`}>Open project</Link>
          <Link to={`/projects/${project.id}/workspace`}>Open workspace</Link>
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
          <span>Status</span>
          <strong>{scenario.status}</strong>
        </div>
      </section>

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
          <h2>No completed result</h2>
          <p>This scenario has not produced a completed simulation result yet.</p>
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
