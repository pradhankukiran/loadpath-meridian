import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createProject } from '../api'

const defaultProjectForm = {
  name: 'North Sea offshore grid study',
  owner: 'System Planning',
  region: 'Scotland, United Kingdom',
  grid_region: 'GB transmission north',
  description:
    'Evaluate grid connection, reinforcement, and renewable integration options.',
}

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
          Create a project workspace for an infrastructure study, then add
          scenarios and simulation runs from the project detail page.
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
              <input
                value={projectForm.owner}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    owner: event.target.value,
                  })
                }
                required
              />
            </label>
            <label>
              <span>Region</span>
              <input
                value={projectForm.region}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    region: event.target.value,
                  })
                }
                required
              />
            </label>
            <label>
              <span>Grid region</span>
              <input
                value={projectForm.grid_region}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    grid_region: event.target.value,
                  })
                }
              />
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
