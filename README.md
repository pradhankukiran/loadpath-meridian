# Loadpath Meridian

Loadpath Meridian is a cloud-based energy infrastructure modelling, simulation,
and scenario-planning platform.

The product is structured as a production-shaped monorepo:

- `apps/web`: React frontend
- `apps/platform`: Laravel platform API for users, projects, subscriptions, and administration
- `apps/simulation`: Flask simulation API and background workers
- `infra`: Docker and deployment configuration
- `docs`: product and architecture notes

Phase 1 establishes the full application foundation: repository structure,
framework scaffolds, service boundaries, Docker orchestration, and smoke checks.
