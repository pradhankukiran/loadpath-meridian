import { useEffect, useState } from 'react'
import { getDataConnectors, type DataConnector } from '../api'

export function DataSourcesPage() {
  const [connectors, setConnectors] = useState<DataConnector[]>([])

  useEffect(() => {
    let isMounted = true

    getDataConnectors().then((data) => {
      if (isMounted) {
        setConnectors(data)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <>
      <section className="page-heading">
        <span className="caption">Data sources</span>
        <h1>Connector registry</h1>
        <p>
          Review external energy, weather, solar, and electricity data sources
          available for scenario inputs.
        </p>
      </section>

      <section className="connector-page-grid">
        {connectors.map((connector) => (
          <article className="connector-page-item" key={connector.id}>
            <h2>{connector.name}</h2>
            <dl>
              <div>
                <dt>Coverage</dt>
                <dd>{connector.coverage}</dd>
              </div>
              <div>
                <dt>Uses</dt>
                <dd>{connector.uses.join(', ')}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </>
  )
}
