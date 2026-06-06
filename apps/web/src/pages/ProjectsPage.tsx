import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProjects, type Project } from '../api'

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loadStatus, setLoadStatus] = useState('Loading projects')

  useEffect(() => {
    let isMounted = true

    getProjects()
      .then((data) => {
        if (isMounted) {
          setProjects(data)
          setLoadStatus('')
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadStatus('Could not load projects')
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <>
      <section className="page-heading">
        <span className="caption">Projects</span>
        <h1>Project portfolio</h1>
        <p>
          Manage energy infrastructure studies, regions, owners, and scenario
          counts across the platform.
        </p>
        <div className="actions">
          <Link to="/projects/new">Create project</Link>
        </div>
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">Owner</th>
              <th scope="col">Region</th>
              <th scope="col">Grid region</th>
              <th scope="col">Scenarios</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {loadStatus ? (
              <tr>
                <td colSpan={6}>{loadStatus}</td>
              </tr>
            ) : !projects.length ? (
              <tr>
                <td colSpan={6}>No projects have been created.</td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr key={project.id}>
                  <th scope="row">
                    <Link to={`/projects/${project.id}`}>{project.name}</Link>
                  </th>
                  <td>{project.owner}</td>
                  <td>{project.region}</td>
                  <td>{project.grid_region}</td>
                  <td>{project.scenarios_count ?? 0}</td>
                  <td>
                    <span className={`tag tag-${project.status}`}>
                      {project.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
