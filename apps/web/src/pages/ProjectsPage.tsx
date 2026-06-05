import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProjects, type Project } from '../api'

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    let isMounted = true

    getProjects().then((data) => {
      if (isMounted) {
        setProjects(data)
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
            {projects.map((project) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
