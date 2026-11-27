# Contributing to Data Registry Dashboard

Follow the Dashboard repository's [contribution guidelines](../../CONTRIBUTING.md)
and this package's [agent guidance](AGENTS.md). Install dependencies with
`pnpm install` at the repository root.

- For UI and BFF work without a cluster, use the [development setup](docs/dev-setup.md).
- For a local dashboard against an existing cluster, use the [local integration guide](docs/environment-setup.md).
- For a complete RHOAI deployment, use the [customer configuration walkthrough](https://github.com/red-hat-data-services/red-hat-ai-examples/blob/main/examples/data-registry/01-configure-data-registry/README.md).

Run the relevant [frontend, BFF, contract, and Cypress checks](docs/testing.md)
before submitting a change. The BFF's [OpenAPI specification](bff/openapi/src/data-registry.yaml)
describes Dashboard-owned routes; the [backend API contract](https://github.com/opendatahub-io/data-registry/tree/main/api-contract)
is the source for registry operations.
