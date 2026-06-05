import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createScenario, getProject, submitSimulation, type Project } from '../api'

const defaultScenarioForm = {
  name: 'Storage sensitivity run',
  objective: 'Test whether additional battery storage reduces curtailment and peak grid imports.',
  engine: 'pypsa',
  horizon: '2035',
  annual_demand_mwh: '1840000',
  peak_load_mw: '482',
  renewable_share_target: '76',
  storage_duration_hours: '6',
  carbon_price: '92',
  grid_import_limit_mw: '310',
}

export function NewScenarioPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [scenarioForm, setScenarioForm] = useState(defaultScenarioForm)
  const [loadStatus, setLoadStatus] = useState('Loading project')
  const [submissionStatus, setSubmissionStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!projectId) {
      return
    }

    let isMounted = true

    getProject(projectId)
      .then((data) => {
        if (isMounted) {
          setProject(data)
          setLoadStatus('')
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadStatus('Could not load project')
        }
      })

    return () => {
      isMounted = false
    }
  }, [projectId])

  async function handleScenarioSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!projectId) {
      return
    }

    setIsSubmitting(true)
    setSubmissionStatus('Creating scenario')

    try {
      const scenario = await createScenario(projectId, {
        name: scenarioForm.name,
        objective: scenarioForm.objective,
        engine: scenarioForm.engine,
        horizon: scenarioForm.horizon,
        annual_demand_mwh: Number(scenarioForm.annual_demand_mwh),
        peak_load_mw: Number(scenarioForm.peak_load_mw),
        renewable_share_target: Number(scenarioForm.renewable_share_target),
        assumptions: {
          storage_duration_hours: Number(scenarioForm.storage_duration_hours),
          carbon_price_gbp_per_tonne: Number(scenarioForm.carbon_price),
          grid_import_limit_mw: Number(scenarioForm.grid_import_limit_mw),
        },
      })

      setSubmissionStatus('Queueing simulation')

      await submitSimulation({
        project_id: projectId,
        scenario_id: scenario.id,
        engine: scenario.engine,
        objective: scenario.objective,
        annual_demand_mwh: scenario.annual_demand_mwh,
        peak_load_mw: scenario.peak_load_mw,
        renewable_share_target: scenario.renewable_share_target,
        assumptions: scenario.assumptions,
      })

      navigate(`/projects/${projectId}/scenarios/${scenario.id}`)
    } catch {
      setSubmissionStatus('Could not create scenario or queue simulation')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <section className="page-heading">
        <span className="caption">Scenario</span>
        <h1>Create scenario</h1>
        <p>
          {loadStatus ||
            `Add a model run to ${project?.name ?? 'this project'} and queue it for execution.`}
        </p>
        <div className="actions">
          <Link to={`/projects/${projectId}`}>Back to project</Link>
          <Link to={`/projects/${projectId}/workspace`}>Open workspace</Link>
        </div>
      </section>

      <section className="builder-panel" aria-labelledby="scenario-create-heading">
        <h2 id="scenario-create-heading">Scenario configuration</h2>
        <form onSubmit={handleScenarioSubmit}>
          <div className="form-grid">
            <label>
              <span>Scenario name</span>
              <input
                name="name"
                value={scenarioForm.name}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    name: event.target.value,
                  })
                }
                required
              />
            </label>
            <label>
              <span>Engine</span>
              <select
                name="engine"
                value={scenarioForm.engine}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    engine: event.target.value,
                  })
                }
              >
                <option value="pypsa">PyPSA</option>
                <option value="pandapower">pandapower</option>
                <option value="pysam">NREL PySAM</option>
                <option value="pvlib">pvlib</option>
                <option value="osemosys">OSeMOSYS</option>
              </select>
            </label>
            <label className="full-width">
              <span>Objective</span>
              <textarea
                name="objective"
                value={scenarioForm.objective}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    objective: event.target.value,
                  })
                }
                rows={3}
                required
              />
            </label>
            <label>
              <span>Horizon</span>
              <input
                name="horizon"
                value={scenarioForm.horizon}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    horizon: event.target.value,
                  })
                }
                required
              />
            </label>
            <label>
              <span>Annual demand MWh</span>
              <input
                name="annual_demand_mwh"
                type="number"
                min="0"
                value={scenarioForm.annual_demand_mwh}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    annual_demand_mwh: event.target.value,
                  })
                }
                required
              />
            </label>
            <label>
              <span>Peak load MW</span>
              <input
                name="peak_load_mw"
                type="number"
                min="0"
                value={scenarioForm.peak_load_mw}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    peak_load_mw: event.target.value,
                  })
                }
                required
              />
            </label>
            <label>
              <span>Renewable target %</span>
              <input
                name="renewable_share_target"
                type="number"
                min="0"
                max="100"
                value={scenarioForm.renewable_share_target}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    renewable_share_target: event.target.value,
                  })
                }
                required
              />
            </label>
            <label>
              <span>Storage duration hours</span>
              <input
                name="storage_duration_hours"
                type="number"
                min="0"
                value={scenarioForm.storage_duration_hours}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    storage_duration_hours: event.target.value,
                  })
                }
              />
            </label>
            <label>
              <span>Carbon price GBP/tCO2e</span>
              <input
                name="carbon_price"
                type="number"
                min="0"
                value={scenarioForm.carbon_price}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    carbon_price: event.target.value,
                  })
                }
              />
            </label>
            <label>
              <span>Grid import limit MW</span>
              <input
                name="grid_import_limit_mw"
                type="number"
                min="0"
                value={scenarioForm.grid_import_limit_mw}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    grid_import_limit_mw: event.target.value,
                  })
                }
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isSubmitting || Boolean(loadStatus)}>
              {isSubmitting ? 'Submitting' : 'Create and queue simulation'}
            </button>
            {submissionStatus ? (
              <span className="status-message">{submissionStatus}</span>
            ) : null}
          </div>
        </form>
      </section>
    </>
  )
}
