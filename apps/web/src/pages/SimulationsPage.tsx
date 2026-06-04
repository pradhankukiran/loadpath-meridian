import { useEffect, useState } from 'react'
import { getRecentSimulationJobs, type SimulationJob } from '../api'

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
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <th scope="row">{job.id}</th>
                <td>{job.model}</td>
                <td>{job.project_id}</td>
                <td>{job.scenario_id}</td>
                <td>{job.progress}%</td>
                <td>
                  <span className={`tag tag-${job.status}`}>{job.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
