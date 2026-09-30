# Data Registry Testing

Run frontend tests from `packages/data-registry/frontend`:

```bash
pnpm run test:lint
pnpm run test:type-check
pnpm run test:unit
```

Run the mocked Cypress suite when changing user flows:

```bash
pnpm run test:cypress-ci
pnpm run cypress:run:mock --spec "**/registry/*.cy.ts"
```

The Cypress mock suite builds the frontend, serves it locally, and replaces
network calls with test fixtures. It does not require an OpenShift cluster.

Run BFF checks from `packages/data-registry/bff`:

```bash
make lint
make test
```

The Go tests use Kubernetes envtest where required. Validate the BFF contract
from the repository root with:

```bash
pnpm --filter @odh-dashboard/data-registry test:contract
```

Use federated development from [Dev Setup](dev-setup.md) for changes that
depend on a live Data Registry API, project permissions, or connection
discovery.
