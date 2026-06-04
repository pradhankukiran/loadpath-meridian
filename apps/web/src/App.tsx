import './App.css'

const projects = [
  {
    name: 'North West grid reinforcement',
    owner: 'Infrastructure Planning',
    region: 'United Kingdom',
    scenarios: 8,
    status: 'Active',
  },
  {
    name: 'Solar and storage capacity study',
    owner: 'Energy Transition',
    region: 'Arizona, United States',
    scenarios: 5,
    status: 'Review',
  },
  {
    name: 'Urban heat network expansion',
    owner: 'City Systems',
    region: 'Manchester, United Kingdom',
    scenarios: 12,
    status: 'Active',
  },
]

const jobs = [
  {
    id: 'SIM-1042',
    model: 'PyPSA capacity expansion',
    project: 'North West grid reinforcement',
    status: 'Running',
  },
  {
    id: 'SIM-1041',
    model: 'pandapower load flow',
    project: 'Solar and storage capacity study',
    status: 'Complete',
  },
  {
    id: 'SIM-1040',
    model: 'NREL PySAM battery dispatch',
    project: 'Urban heat network expansion',
    status: 'Queued',
  },
]

function App() {
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
            <strong>18</strong>
          </div>
          <div className="summary-item">
            <span>Simulation jobs</span>
            <strong>47</strong>
          </div>
          <div className="summary-item">
            <span>Scenario runs</span>
            <strong>1,284</strong>
          </div>
          <div className="summary-item">
            <span>Data connectors</span>
            <strong>9</strong>
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
                    <tr key={project.name}>
                      <th scope="row">
                        <a href="/projects">{project.name}</a>
                      </th>
                      <td>{project.owner}</td>
                      <td>{project.region}</td>
                      <td>{project.scenarios}</td>
                      <td>
                        <span className={`tag tag-${project.status.toLowerCase()}`}>
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
                    <small>{job.project}</small>
                  </div>
                  <span className={`tag tag-${job.status.toLowerCase()}`}>
                    {job.status}
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </section>
      </main>
    </div>
  )
}

export default App
