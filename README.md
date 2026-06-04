# Loadpath Meridian

Loadpath Meridian is a cloud-based energy infrastructure modelling, simulation,
and scenario-planning platform.

The product is structured as a production-shaped monorepo:

- `apps/web`: React frontend
- `apps/platform`: Laravel platform API for users, projects, subscriptions, and administration
- `apps/simulation`: Flask simulation API and background workers
- `infra`: Docker and deployment configuration
- `docs`: product and architecture notes

The current build includes project and scenario workflows, simulation result
generation, data connectors, scenario comparison reports, Modal-backed assistant
integration, and Railway/Vercel deployment configuration.
