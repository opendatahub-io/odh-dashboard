# MaaS UI

## Overview

MaaS (Models-as-a-Service) is a federated ODH Dashboard plugin (`@odh-dashboard/maas`) that provides the user interface for LLM endpoint access management. It lets operators configure model endpoints and usage quotas, and lets users list available models and create API tokens.

The package ships a Go BFF and a React frontend following the ODH Dashboard Mod Arch pattern.

## Deployment Modes

| Mode | Theme | When to use |
|------|-------|-------------|
| `federated` | PatternFly | Production — loaded by ODH/RHOAI Dashboard as a federated module |
| `standalone` | MUI | Local development without a cluster |
| `kubeflow` | MUI | Running inside a Kubeflow environment |

## Quick Start

```bash
# Standalone mode — no cluster required (mocked K8s + MaaS API)
make dev-start

# Federated mode with mocks — no cluster required
make dev-start-mock-federated

# Federated mode — connects to a real OpenShift cluster with MaaS installed
# Set MAAS_API_URL in .env.local, or let the Makefile auto-detect from the cluster
make dev-start-federated
```

See [`docs/local-deployment-guide.md`](./docs/local-deployment-guide.md) for prerequisites and detailed setup instructions.

## Contributing

See the [contributing guidelines](./CONTRIBUTING.md).

## OpenAPI Specification

The BFF contract is defined in [`bff/openapi.yaml`](./bff/openapi.yaml).

## Environment Variables

Define these in a `.env.local` file in the `packages/maas/` directory. **These values affect build and push commands.**

### `CONTAINER_TOOL`

- **Description**: Container tool to use for building and running images.
- **Default**: `docker`
- **Example**: `CONTAINER_TOOL=podman`

### `IMG_UI`

- **Description**: Image name and tag for the kubeflow-mode build.
- **Example**: `IMG_UI=quay.io/<your-registry>/maas-ui:latest`

### `IMG_UI_STANDALONE`

- **Description**: Image name and tag for the standalone-mode build.
- **Example**: `IMG_UI_STANDALONE=quay.io/<your-registry>/maas-ui-standalone:latest`

### `IMG_UI_FEDERATED`

- **Description**: Image name and tag for the federated-mode build.
- **Example**: `IMG_UI_FEDERATED=quay.io/<your-registry>/maas-ui-federated:latest`

### `PLATFORM`

- **Description**: Target platform for `docker buildx` multi-arch builds.
- **Default**: `linux/amd64`
- **Example**: `PLATFORM=linux/amd64`

### `DEPLOYMENT_MODE`

- **Description**: Sets the deployment mode for the UI build.
- **Possible values**: `standalone`, `kubeflow`, `federated`
- **Example**: `DEPLOYMENT_MODE=federated`

### `STYLE_THEME`

- **Description**: UI theme/styling framework.
- **Possible values**: `mui-theme`, `patternfly-theme`
- **Example**: `STYLE_THEME=patternfly-theme`

### `MAAS_API_URL`

- **Description**: External base URL of the MaaS API that the BFF uses for passthrough calls (models, API keys, subscriptions).
- **Default**: _(none)_ — when running in-cluster without this set, the BFF discovers the URL by calling `GET /v1/tenants` on the internal `maas-api` Service, selecting the tenant with gateway `maas-default-gateway`, and appending `/maas-api` to `gateway.externalUrl`. If discovery fails (for example `maas-api` is not installed yet), the BFF starts in a degraded mode: maas-api-dependent routes return `503`, and discovery is retried in the background until it succeeds.
- **Example**: `MAAS_API_URL=https://maas.apps.my-cluster.example.com/maas-api`

### `MAAS_API_INTERNAL_URL`

- **Description**: Internal `maas-api` Service base URL used only for `/v1/tenants` gateway discovery (not for passthrough). Overrides namespace-based auto-detection.
- **Default**: _(none)_ — when unset, the BFF lists the cluster `DataScienceCluster` and maps `status.release.name` to the infra namespace (`Open Data Hub` → `odh-ai-gateway-infra`; `OpenShift AI Self-Managed` / `OpenShift AI Cloud Service` → `redhat-ai-gateway-infra`). Falls back to `redhat-ai-gateway-infra` unless `MAAS_API_NAMESPACE` is set.
- **Example**: `MAAS_API_INTERNAL_URL=https://maas-api.odh-ai-gateway-infra.svc.cluster.local:8443`

### `MAAS_API_NAMESPACE`

- **Description**: Namespace of the internal `maas-api` Service when `MAAS_API_INTERNAL_URL` is not set. Overrides DSC-based auto-detection.
- **Default**: _(none)_ — auto-resolved from DSC `status.release.name`, then `redhat-ai-gateway-infra` as fallback.
- **Example**: `MAAS_API_NAMESPACE=redhat-ai-gateway-infra`

### Example `.env.local`

```shell
CONTAINER_TOOL=podman
IMG_UI=quay.io/<your-registry>/maas-ui:latest
IMG_UI_STANDALONE=quay.io/<your-registry>/maas-ui-standalone:latest
IMG_UI_FEDERATED=quay.io/<your-registry>/maas-ui-federated:latest
PLATFORM=linux/amd64
MAAS_API_URL=https://maas.apps.my-cluster.example.com/maas-api
```

## Build and Push Commands

### Build Commands

| Command | Mode | Description |
|---------|------|-------------|
| `make docker-build` | kubeflow | Build image with MUI theme |
| `make docker-build-standalone` | standalone | Build image with MUI theme, standalone mode |
| `make docker-build-federated` | federated | Build image with PatternFly theme |
| `make docker-buildx` | kubeflow | Multi-arch build with buildx |
| `make docker-buildx-standalone` | standalone | Multi-arch build, standalone mode |
| `make docker-buildx-federated` | federated | Multi-arch build, federated mode |

### Push Commands

| Command | Description |
|---------|-------------|
| `make docker-push` | Push kubeflow-mode image |
| `make docker-push-standalone` | Push standalone-mode image |
| `make docker-push-federated` | Push federated-mode image |

## Documentation

- [Docs overview](./docs/README.md)
- [Getting started](./docs/install.md)
- [Overview & concepts](./docs/overview.md)
- [Local development guide (federated)](./docs/local-deployment-guide.md)
- [Local UI development guide](./docs/local-deployment-guide-ui.md)
- [BFF README](./bff/README.md)
- [BFF consumer contract](./bff/CONSUMERS.md)
- [Frontend architecture](./frontend/docs/architecture.md)
