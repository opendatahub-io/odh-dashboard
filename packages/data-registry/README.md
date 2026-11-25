# Data Registry Dashboard

This package contains the federated Data Registry UI and its Go BFF for the
OpenShift AI Dashboard. The registry API runs separately on the cluster and
stores asset metadata and location references, not the underlying data.

## Start Here

- [Dashboard documentation](docs/README.md) — UI workflows, local development,
  architecture, and testing.
- [Contributing](CONTRIBUTING.md) — package setup and checks.
- [Backend API guide and contract](https://github.com/opendatahub-io/data-registry)
  — direct API use and schemas.
- [Customer walkthrough](https://github.com/red-hat-data-services/red-hat-ai-examples/tree/main/examples/data-registry)
  — cluster setup, asset registration, notebook access, and sharing.

The dashboard loads the React remote and routes requests through the BFF. The
BFF uses the caller's identity for project and connection lookups and forwards
registry operations to the backend. See the [request flow](docs/architecture.md)
and [BFF connection behavior](bff/README.md#dch-connection-lookup).

The [BFF OpenAPI specification](bff/openapi/src/data-registry.yaml) describes
Dashboard-owned routes. Its [vendored registry contract](bff/openapi/src/data-registry-api.yaml)
supports the proxy; the [backend repository](https://github.com/opendatahub-io/data-registry/tree/main/api-contract)
publishes the API contract for direct consumers.
