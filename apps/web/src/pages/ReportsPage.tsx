import { useEffect, useMemo, useState } from 'react'
import {
  downloadProjectReportPackage,
  getProjects,
  getScenarioComparison,
  type Project,
  type ScenarioComparison,
} from '../api'
import { formatNumber, formatPercent } from '../lib/format'

export function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [comparison, setComparison] = useState<ScenarioComparison | null>(null)
  const [exportStatus, setExportStatus] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    let isMounted = true

    getProjects().then((data) => {
      if (!isMounted) {
        return
      }

      setProjects(data)
      setSelectedProjectId((current) => current || data[0]?.id || '')
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedProjectId) {
      return
    }

    let isMounted = true

    getScenarioComparison(selectedProjectId).then((data) => {
      if (isMounted) {
        setComparison(data)
      }
    })

    return () => {
      isMounted = false
    }
  }, [selectedProjectId])

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId)
  }, [projects, selectedProjectId])

  async function handleExportPackage() {
    if (!selectedProjectId) {
      return
    }

    setIsExporting(true)
    setExportStatus('Preparing report package')

    try {
      const packageBlob = await downloadProjectReportPackage(selectedProjectId)
      const objectUrl = URL.createObjectURL(packageBlob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `loadpath-meridian-${selectedProjectId}-report-package.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      setExportStatus('Report package downloaded')
    } catch {
      setExportStatus('Could not export report package')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <section className="page-heading">
        <span className="caption">Reports</span>
        <h1>Scenario comparison report</h1>
        <p>
          Compare completed simulation results and prepare a report-ready view
          for cost, emissions, renewable share, reliability, and curtailment.
        </p>
      </section>

      <section className="report-controls" aria-label="Report controls">
        <div className="report-control-row">
          <label>
            <span>Project</span>
            <select
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <div className="report-export-actions">
            <button
              type="button"
              onClick={handleExportPackage}
              disabled={!selectedProjectId || isExporting}
            >
              {isExporting ? 'Exporting' : 'Export report package'}
            </button>
            {exportStatus ? (
              <span className="status-message">{exportStatus}</span>
            ) : null}
          </div>
        </div>
      </section>

      {comparison ? (
        <>
          <section className="report-summary-grid" aria-label="Report summary">
            <div>
              <span>Project</span>
              <strong>{selectedProject?.name ?? comparison.project_id}</strong>
            </div>
            <div>
              <span>Completed scenarios</span>
              <strong>{comparison.scenario_count}</strong>
            </div>
            <div>
              <span>Best value</span>
              <strong>{comparison.indicators.best_value_scenario_id ?? '-'}</strong>
            </div>
            <div>
              <span>Lowest emissions</span>
              <strong>
                {comparison.indicators.lowest_emissions_scenario_id ?? '-'}
              </strong>
            </div>
          </section>

          <section className="decision-panel" aria-label="Decision summary">
            <h2>Decision summary</h2>
            <p>{comparison.indicators.summary}</p>
          </section>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Scenario</th>
                  <th scope="col">Engine</th>
                  <th scope="col">Cost</th>
                  <th scope="col">Renewables</th>
                  <th scope="col">Emissions</th>
                  <th scope="col">Curtailment</th>
                  <th scope="col">Reliability</th>
                </tr>
              </thead>
              <tbody>
                {comparison.scenarios.map((scenario) => (
                  <tr key={scenario.scenario_id}>
                    <th scope="row">{scenario.scenario_id}</th>
                    <td>{scenario.engine}</td>
                    <td>£{scenario.total_cost_million}m</td>
                    <td>{formatPercent(scenario.renewable_share_percent)}</td>
                    <td>
                      {formatNumber(scenario.emissions_tonnes_co2e)} tCO2e
                    </td>
                    <td>{formatNumber(scenario.curtailment_mwh)} MWh</td>
                    <td>
                      {formatPercent(scenario.reliability_margin_percent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="report-grid comparison-grid">
            <article>
              <h2>Best value</h2>
              <p>{comparison.indicators.best_value_scenario_id ?? '-'}</p>
            </article>
            <article>
              <h2>Highest renewable share</h2>
              <p>{comparison.indicators.highest_renewable_scenario_id ?? '-'}</p>
            </article>
            <article>
              <h2>Highest risk</h2>
              <p>{comparison.indicators.highest_risk_scenario_id ?? '-'}</p>
            </article>
          </section>
        </>
      ) : (
        <p>Loading report comparison.</p>
      )}
    </>
  )
}
