import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  createScenario,
  getProject,
  submitSimulation,
  type Project,
  type SimulationJob,
} from '../api'

const defaultScenarioForm = {
  name: '',
  objective: '',
  engine: 'pypsa',
  horizon: '',
  annual_demand_mwh: '',
  peak_load_mw: '',
  renewable_share_target: '',
  storage_duration_hours: '4',
  carbon_price: '92',
  grid_import_limit_mw: '310',
}

const objectiveOptions = [
  { value: '', label: 'Select objective' },
  {
    value: 'Minimise system cost while meeting forecast demand.',
    label: 'Least-cost capacity plan',
  },
  {
    value: 'Evaluate grid reinforcement needs under peak demand growth.',
    label: 'Grid reinforcement study',
  },
  {
    value: 'Estimate renewable and storage build-out required for target compliance.',
    label: 'Renewable/storage build-out',
  },
  {
    value: 'Assess reliability and curtailment under constrained imports.',
    label: 'Reliability and curtailment',
  },
  {
    value: 'Quantify emissions reduction from clean generation and flexibility.',
    label: 'Emissions reduction',
  },
]

const horizonOptions = [
  { value: '', label: 'Select horizon' },
  { value: '2028', label: '2028 near-term delivery' },
  { value: '2030', label: '2030 policy milestone' },
  { value: '2035', label: '2035 planning case' },
  { value: '2040', label: '2040 transition case' },
  { value: '2050', label: '2050 net zero case' },
]

const annualDemandOptions = [
  { value: '', label: 'Select annual demand' },
  { value: '250000', label: '250,000 MWh local distribution' },
  { value: '620000', label: '620,000 MWh regional network' },
  { value: '1840000', label: '1,840,000 MWh transmission zone' },
  { value: '5000000', label: '5,000,000 MWh national system' },
]

const peakLoadOptions = [
  { value: '', label: 'Select peak load' },
  { value: '75', label: '75 MW local peak' },
  { value: '155', label: '155 MW urban peak' },
  { value: '482', label: '482 MW transmission peak' },
  { value: '1200', label: '1,200 MW national peak' },
]

const renewableTargetOptions = [
  { value: '', label: 'Select renewable target' },
  { value: '50', label: '50% balanced transition' },
  { value: '65', label: '65% accelerated build-out' },
  { value: '75', label: '75% high-renewable case' },
  { value: '85', label: '85% clean system case' },
  { value: '95', label: '95% near-zero-carbon case' },
]

const storageDurationOptions = [
  { value: '0', label: '0 hours no storage' },
  { value: '2', label: '2 hours short-duration' },
  { value: '4', label: '4 hours grid battery' },
  { value: '6', label: '6 hours evening peak' },
  { value: '8', label: '8 hours long-duration' },
  { value: '12', label: '12 hours resilience case' },
]

const carbonPriceOptions = [
  { value: '0', label: 'GBP 0/tCO2e none' },
  { value: '50', label: 'GBP 50/tCO2e low' },
  { value: '92', label: 'GBP 92/tCO2e central' },
  { value: '125', label: 'GBP 125/tCO2e high' },
  { value: '180', label: 'GBP 180/tCO2e stress case' },
]

const gridImportLimitOptions = [
  { value: '0', label: '0 MW islanded system' },
  { value: '150', label: '150 MW constrained import' },
  { value: '310', label: '310 MW central import' },
  { value: '500', label: '500 MW reinforced import' },
  { value: '1000', label: '1,000 MW unconstrained import' },
]

export function NewScenarioPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [scenarioForm, setScenarioForm] = useState(defaultScenarioForm)
  const [loadStatus, setLoadStatus] = useState('Loading project')
  const [submissionStatus, setSubmissionStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdScenarioId, setCreatedScenarioId] = useState('')
  const [queuedJob, setQueuedJob] = useState<SimulationJob | null>(null)

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
    setCreatedScenarioId('')
    setQueuedJob(null)

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

      setCreatedScenarioId(scenario.id)
      setSubmissionStatus('Queueing simulation')

      const job = await submitSimulation({
        project_id: projectId,
        scenario_id: scenario.id,
        engine: scenario.engine,
        objective: scenario.objective,
        annual_demand_mwh: scenario.annual_demand_mwh,
        peak_load_mw: scenario.peak_load_mw,
        renewable_share_target: scenario.renewable_share_target,
        assumptions: scenario.assumptions,
      })

      setQueuedJob(job)
      setSubmissionStatus('Simulation queued')
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
        </div>
      </section>

      <section className="builder-panel" aria-labelledby="scenario-create-heading">
        <h2 id="scenario-create-heading">Scenario configuration</h2>
        {isSubmitting || submissionStatus ? (
          <div className="scenario-run-state launch-state" aria-live="polite">
            <h3>Launching run</h3>
            <ol>
              <li>
                <div>
                  <strong>Create scenario</strong>
                  <small>
                    {createdScenarioId
                      ? createdScenarioId
                      : 'Writing scenario configuration'}
                  </small>
                </div>
                <span className={`tag tag-${createdScenarioId ? 'complete' : 'running'}`}>
                  {createdScenarioId ? 'complete' : 'running'}
                </span>
              </li>
              <li>
                <div>
                  <strong>Queue simulation</strong>
                  <small>
                    {queuedJob
                      ? queuedJob.id
                      : createdScenarioId
                        ? 'Submitting run to simulation service'
                        : 'Waiting for scenario'}
                  </small>
                </div>
                <span
                  className={`tag tag-${
                    queuedJob ? 'queued' : createdScenarioId ? 'running' : 'draft'
                  }`}
                >
                  {queuedJob ? 'queued' : createdScenarioId ? 'running' : 'waiting'}
                </span>
              </li>
              <li>
                <div>
                  <strong>Open run page</strong>
                  <small>
                    {queuedJob
                      ? 'Opening live scenario run status'
                      : 'This will open when the job is accepted'}
                  </small>
                </div>
                <span className={`tag tag-${queuedJob ? 'running' : 'draft'}`}>
                  {queuedJob ? 'opening' : 'waiting'}
                </span>
              </li>
            </ol>
            {submissionStatus ? (
              <p className="status-message">{submissionStatus}</p>
            ) : null}
          </div>
        ) : null}
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
              <select
                name="objective"
                value={scenarioForm.objective}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    objective: event.target.value,
                  })
                }
                required
              >
                {objectiveOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Horizon</span>
              <select
                name="horizon"
                value={scenarioForm.horizon}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    horizon: event.target.value,
                  })
                }
                required
              >
                {horizonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Annual demand MWh</span>
              <select
                name="annual_demand_mwh"
                value={scenarioForm.annual_demand_mwh}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    annual_demand_mwh: event.target.value,
                  })
                }
                required
              >
                {annualDemandOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Peak load MW</span>
              <select
                name="peak_load_mw"
                value={scenarioForm.peak_load_mw}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    peak_load_mw: event.target.value,
                  })
                }
                required
              >
                {peakLoadOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Renewable target %</span>
              <select
                name="renewable_share_target"
                value={scenarioForm.renewable_share_target}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    renewable_share_target: event.target.value,
                  })
                }
                required
              >
                {renewableTargetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Storage duration hours</span>
              <select
                name="storage_duration_hours"
                value={scenarioForm.storage_duration_hours}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    storage_duration_hours: event.target.value,
                  })
                }
              >
                {storageDurationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Carbon price GBP/tCO2e</span>
              <select
                name="carbon_price"
                value={scenarioForm.carbon_price}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    carbon_price: event.target.value,
                  })
                }
              >
                {carbonPriceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Grid import limit MW</span>
              <select
                name="grid_import_limit_mw"
                value={scenarioForm.grid_import_limit_mw}
                onChange={(event) =>
                  setScenarioForm({
                    ...scenarioForm,
                    grid_import_limit_mw: event.target.value,
                  })
                }
              >
                {gridImportLimitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
