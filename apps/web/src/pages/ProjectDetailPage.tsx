import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProject, type Project } from '../api'
import { formatNumber, formatPercent } from '../lib/format'

export function ProjectDetailPage() {
  const { projectId = '' } = useParams()
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    if (!projectId) {
      return
    }

    let isMounted = true

    getProject(projectId).then((data) => {
      if (isMounted) {
        setProject(data)
      }
    })

    return () => {
      isMounted = false
    }
  }, [projectId])

  if (!project) {
    return <p>Loading project.</p>
  }

  const scenarios = project.scenarios ?? []

  return (
    <>
      <section className="page-heading">
        <span className="caption">Project</span>
        <h1>{project.name}</h1>
        <p>{project.description ?? 'No project description has been recorded.'}</p>
        <div className="actions">
          <Link to={`/projects/${project.id}/workspace`}>Open workspace</Link>
          <Link to={`/projects/${project.id}/reports`}>Open reports</Link>
        </div>
      </section>

      <section className="summary-grid" aria-label="Project summary">
        <div className="summary-item">
          <span>Owner</span>
          <strong>{project.owner}</strong>
        </div>
        <div className="summary-item">
          <span>Region</span>
          <strong>{project.region}</strong>
        </div>
        <div className="summary-item">
          <span>Grid region</span>
          <strong>{project.grid_region ?? '-'}</strong>
        </div>
        <div className="summary-item">
          <span>Scenarios</span>
          <strong>{scenarios.length}</strong>
        </div>
      </section>

      <div className="section-heading">
        <h2>Scenarios</h2>
        <Link to={`/projects/${project.id}/scenarios/new`}>Create scenario</Link>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Scenario</th>
              <th scope="col">Engine</th>
              <th scope="col">Horizon</th>
              <th scope="col">Peak load</th>
              <th scope="col">Renewable target</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.length ? (
              scenarios.map((scenario) => (
                <tr key={scenario.id}>
                  <th scope="row">{scenario.name}</th>
                  <td>{scenario.engine}</td>
                  <td>{scenario.horizon}</td>
                  <td>{formatNumber(scenario.peak_load_mw)} MW</td>
                  <td>{formatPercent(scenario.renewable_share_target)}</td>
                  <td>
                    <span className={`tag tag-${scenario.status}`}>
                      {scenario.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>No scenarios have been created for this project.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
