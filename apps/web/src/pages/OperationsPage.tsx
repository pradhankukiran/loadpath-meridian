import { useEffect, useState } from 'react'
import {
  getPlatformOperationsStatus,
  getSimulationOperationsStatus,
  type ServiceOperationsStatus,
} from '../api'
import { formatNumber } from '../lib/format'

type ServiceState = {
  platform: ServiceOperationsStatus | null
  simulation: ServiceOperationsStatus | null
}

function statusRank(status: string) {
  if (status === 'ok' || status === 'configured' || status === 'not_required') {
    return 'ok'
  }

  if (status === 'degraded') {
    return 'degraded'
  }

  return 'failed'
}

function serviceLabel(service: string) {
  return service.replace('loadpath-meridian-', '')
}

function checkEntries(status: ServiceOperationsStatus | null) {
  return Object.entries(status?.checks ?? {})
}

export function OperationsPage() {
  const [services, setServices] = useState<ServiceState>({
    platform: null,
    simulation: null,
  })

  useEffect(() => {
    let isMounted = true

    async function loadOperations() {
      const [platform, simulation] = await Promise.all([
        getPlatformOperationsStatus(),
        getSimulationOperationsStatus(),
      ])

      if (!isMounted) {
        return
      }

      setServices({ platform, simulation })
    }

    loadOperations()
    const interval = window.setInterval(loadOperations, 30000)

    return () => {
      isMounted = false
      window.clearInterval(interval)
    }
  }, [])

  const serviceList = [services.platform, services.simulation].filter(
    Boolean,
  ) as ServiceOperationsStatus[]
  const degradedCount = serviceList.filter(
    (service) => service.status !== 'ok',
  ).length
  const simulationQueue = services.simulation?.queue

  return (
    <>
      <section className="page-heading">
        <span className="caption">Operations</span>
        <h1>Service health</h1>
        <p>
          Track deployed platform, simulation, queue, worker, and integration
          health from the same status contracts used by Railway health checks.
        </p>
      </section>

      <section className="summary-grid" aria-label="Operations summary">
        <div className="summary-item">
          <span>Services</span>
          <strong>{serviceList.length || '-'}</strong>
        </div>
        <div className="summary-item">
          <span>Degraded</span>
          <strong>{degradedCount}</strong>
        </div>
        <div className="summary-item">
          <span>Queued jobs</span>
          <strong>{simulationQueue?.counts.queued ?? '-'}</strong>
        </div>
        <div className="summary-item">
          <span>Failed jobs</span>
          <strong>{simulationQueue?.counts.failed ?? '-'}</strong>
        </div>
      </section>

      <section className="operations-grid" aria-label="Service checks">
        {[services.platform, services.simulation].map((service) =>
          service ? (
            <article key={service.service} className="operations-service">
              <div className="section-heading">
                <h2>{serviceLabel(service.service)}</h2>
                <span className={`tag tag-${service.status}`}>
                  {service.status}
                </span>
              </div>
              <dl className="input-summary">
                <div>
                  <dt>Environment</dt>
                  <dd>{service.environment}</dd>
                </div>
                <div>
                  <dt>Request ID</dt>
                  <dd>{service.request_id_header ?? '-'}</dd>
                </div>
                {service.logging ? (
                  <div>
                    <dt>Logging</dt>
                    <dd>
                      {service.logging.channel} / {service.logging.level}
                    </dd>
                  </div>
                ) : null}
                {service.redis ? (
                  <div>
                    <dt>Redis latency</dt>
                    <dd>
                      {typeof service.redis.latency_ms === 'number'
                        ? `${service.redis.latency_ms} ms`
                        : '-'}
                    </dd>
                  </div>
                ) : null}
                {service.worker ? (
                  <div>
                    <dt>Workers</dt>
                    <dd>
                      {service.worker.mode} / {service.worker.active_workers}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <h3>Checks</h3>
              <div className="check-grid">
                {checkEntries(service).map(([name, value]) => (
                  <div key={name}>
                    <span>{name.replace(/_/g, ' ')}</span>
                    <strong className={`check-${statusRank(value)}`}>
                      {value}
                    </strong>
                  </div>
                ))}
              </div>

              {service.queue ? (
                <>
                  <h3>Queue</h3>
                  <dl className="queue-counts">
                    <div>
                      <dt>Mode</dt>
                      <dd>{service.queue.mode}</dd>
                    </div>
                    {Object.entries(service.queue.counts).map(([name, count]) => (
                      <div key={name}>
                        <dt>{name}</dt>
                        <dd>{formatNumber(count)}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : null}
            </article>
          ) : null,
        )}
      </section>
    </>
  )
}
