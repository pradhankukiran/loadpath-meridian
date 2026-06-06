import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { DataSourcesPage } from './pages/DataSourcesPage'
import { NewProjectPage } from './pages/NewProjectPage'
import { NewScenarioPage } from './pages/NewScenarioPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ReportsPage } from './pages/ReportsPage'
import { ScenarioDetailPage } from './pages/ScenarioDetailPage'
import { SimulationsPage } from './pages/SimulationsPage'
import { OperationsPage } from './pages/OperationsPage'

function App() {
  return (
    <div className="app-shell">
      <header className="service-header">
        <div className="container header-inner">
          <NavLink className="brand" to="/projects">
            Loadpath Meridian
          </NavLink>
          <nav aria-label="Primary navigation">
            <NavLink to="/projects">Projects</NavLink>
            <NavLink to="/simulations">Simulations</NavLink>
            <NavLink to="/data-sources">Data sources</NavLink>
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
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route
            path="/projects/:projectId/scenarios/new"
            element={<NewScenarioPage />}
          />
          <Route
            path="/projects/:projectId/scenarios/:scenarioId"
            element={<ScenarioDetailPage />}
          />
          <Route path="/projects/:projectId/reports" element={<ReportsPage />} />
          <Route path="/simulations" element={<SimulationsPage />} />
          <Route path="/data-sources" element={<DataSourcesPage />} />
          <Route path="/reports" element={<Navigate to="/projects" replace />} />
          <Route path="/operations" element={<OperationsPage />} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
