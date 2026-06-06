import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createProject } from '../api'

const defaultProjectForm = {
  name: '',
  owner: '',
  region: '',
  grid_region: '',
  description: '',
}

const ownerOptions = [
  { value: '', label: 'Select owner' },
  { value: 'System Planning', label: 'System Planning' },
  { value: 'Transmission Planning', label: 'Transmission Planning' },
  { value: 'Distribution Planning', label: 'Distribution Planning' },
  { value: 'Asset Management', label: 'Asset Management' },
  { value: 'Commercial Strategy', label: 'Commercial Strategy' },
]

const regionOptions = [
  { value: '', label: 'Select region' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Scotland, United Kingdom', label: 'Scotland, United Kingdom' },
  {
    value: 'England and Wales, United Kingdom',
    label: 'England and Wales, United Kingdom',
  },
  { value: 'European Union', label: 'European Union' },
  { value: 'United States', label: 'United States' },
  { value: 'Middle East', label: 'Middle East' },
]

const gridRegionOptions = [
  { value: '', label: 'Select grid region' },
  { value: 'GB transmission north', label: 'GB transmission north' },
  { value: 'GB transmission south', label: 'GB transmission south' },
  { value: 'GB distribution network', label: 'GB distribution network' },
  { value: 'WECC southwest', label: 'WECC southwest' },
  { value: 'ERCOT', label: 'ERCOT' },
  { value: 'ENTSO-E continental', label: 'ENTSO-E continental' },
]

export function NewProjectPage() {
  const navigate = useNavigate()
  const [projectForm, setProjectForm] = useState(defaultProjectForm)
  const [submissionStatus, setSubmissionStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleProjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setIsSubmitting(true)
    setSubmissionStatus('Creating project')

    try {
      const project = await createProject({
        name: projectForm.name,
        owner: projectForm.owner,
        region: projectForm.region,
        grid_region: projectForm.grid_region,
        description: projectForm.description,
        status: 'active',
      })

      navigate(`/projects/${project.id}`)
    } catch {
      setSubmissionStatus('Could not create project')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <section className="page-heading">
        <span className="caption">Projects</span>
        <h1>Create project</h1>
        <p>
          Create an infrastructure study, then add scenarios and simulation
          runs from the project page.
        </p>
      </section>

      <section className="builder-panel" aria-labelledby="new-project-heading">
        <h2 id="new-project-heading">Project details</h2>
        <form onSubmit={handleProjectSubmit}>
          <div className="form-grid">
            <label>
              <span>Project name</span>
              <input
                value={projectForm.name}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    name: event.target.value,
                  })
                }
                required
              />
            </label>
            <label>
              <span>Owner</span>
              <select
                value={projectForm.owner}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    owner: event.target.value,
                  })
                }
                required
              >
                {ownerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Region</span>
              <select
                value={projectForm.region}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    region: event.target.value,
                  })
                }
                required
              >
                {regionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Grid region</span>
              <select
                value={projectForm.grid_region}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    grid_region: event.target.value,
                  })
                }
                required
              >
                {gridRegionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-width">
              <span>Description</span>
              <textarea
                value={projectForm.description}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    description: event.target.value,
                  })
                }
                rows={4}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating' : 'Create project'}
            </button>
            <Link to="/projects">Cancel</Link>
            {submissionStatus ? (
              <span className="status-message">{submissionStatus}</span>
            ) : null}
          </div>
        </form>
      </section>
    </>
  )
}
