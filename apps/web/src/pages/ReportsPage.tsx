export function ReportsPage() {
  return (
    <>
      <section className="page-heading">
        <span className="caption">Reports</span>
        <h1>Scenario reports</h1>
        <p>
          Prepare client-facing summaries from project assumptions, imported
          data, generated simulation results, and assistant-ready notes.
        </p>
      </section>

      <section className="report-grid">
        <article>
          <h2>Executive summary</h2>
          <p>
            High-level cost, emissions, reliability, and renewable-share
            findings for non-technical stakeholders.
          </p>
        </article>
        <article>
          <h2>Technical appendix</h2>
          <p>
            Scenario assumptions, data source summaries, dispatch samples, and
            model output tables.
          </p>
        </article>
        <article>
          <h2>Comparison pack</h2>
          <p>
            Side-by-side scenario comparison for storage, grid import limits,
            cost, curtailment, and emissions.
          </p>
        </article>
      </section>
    </>
  )
}
