import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { DataSourcesPage } from './pages/DataSourcesPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ReportsPage } from './pages/ReportsPage'
import { SimulationsPage } from './pages/SimulationsPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { OperationsPage } from './pages/OperationsPage'

function App() {
  return (
    <div className="app-shell">
      <header className="service-header">
        <div className="container header-inner">
          <NavLink className="brand" to="/">
            Loadpath Meridian
          </NavLink>
          <nav aria-label="Primary navigation">
            <NavLink to="/projects">Projects</NavLink>
            <NavLink to="/simulations">Simulations</NavLink>
            <NavLink to="/data-sources">Data sources</NavLink>
            <NavLink to="/reports">Reports</NavLink>
            <NavLink to="/operations">Operations</NavLink>
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

        <Routes>
          <Route path="/" element={<WorkspacePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/simulations" element={<SimulationsPage />} />
          <Route path="/data-sources" element={<DataSourcesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/operations" element={<OperationsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
