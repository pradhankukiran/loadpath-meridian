import { useEffect, useState } from 'react'
import { getRecentSimulationJobs, type SimulationJob } from '../api'
import { formatDateTime } from '../lib/format'

export function SimulationsPage() {
  const [jobs, setJobs] = useState<SimulationJob[]>([])

  useEffect(() => {
    let isMounted = true

    getRecentSimulationJobs().then((data) => {
      if (isMounted) {
        setJobs(data)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  const runningCount = jobs.filter((job) => job.status === 'running').length
  const queuedCount = jobs.filter((job) => job.status === 'queued').length
  const completedCount = jobs.filter((job) => job.status === 'complete').length
  const failedCount = jobs.filter((job) => job.status === 'failed').length

  return (
    <>
      <section className="page-heading">
        <span className="caption">Simulations</span>
        <h1>Simulation operations</h1>
        <p>
          Monitor submitted jobs, engines, status, progress, and the scenario
          each model run belongs to.
        </p>
      </section>

      <section className="summary-grid" aria-label="Simulation summary">
        <div className="summary-item">
          <span>Total jobs</span>
          <strong>{jobs.length}</strong>
        </div>
        <div className="summary-item">
          <span>Running</span>
          <strong>{runningCount}</strong>
        </div>
        <div className="summary-item">
          <span>Queued</span>
          <strong>{queuedCount}</strong>
        </div>
        <div className="summary-item">
          <span>Completed / failed</span>
          <strong>
            {completedCount} / {failedCount}
          </strong>
        </div>
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Job</th>
              <th scope="col">Model</th>
              <th scope="col">Project</th>
              <th scope="col">Scenario</th>
              <th scope="col">Progress</th>
              <th scope="col">Status</th>
              <th scope="col">Submitted</th>
              <th scope="col">Completed</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length ? (
              jobs.map((job) => (
                <tr key={job.id}>
                  <th scope="row">{job.id}</th>
                  <td>
                    {job.model}
                    {job.error_message ? (
                      <small className="error-copy">{job.error_message}</small>
                    ) : null}
                  </td>
                  <td>{job.project_id}</td>
                  <td>{job.scenario_id}</td>
                  <td>
                    <div className="progress-track">
                      <span
                        className="progress-fill"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <small>{job.progress}%</small>
                  </td>
                  <td>
                    <span className={`tag tag-${job.status}`}>
                      {job.status}
                    </span>
                  </td>
                  <td>{formatDateTime(job.submitted_at)}</td>
                  <td>{formatDateTime(job.completed_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8}>No simulation jobs have been submitted.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
