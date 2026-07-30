# Agent Ops UI

## Overview

The Agent Ops UI is a standalone web app for Agent Ops. In this repository, you will find the frontend and backend for the Agent Ops UI.

## Contributing

You can check the [contributing guidelines] for more information on how to contribute to the Agent Ops UI.

## Quick Install

Bootstrap a fresh copy of this starter without cloning the repo by using the published CLI:

```bash
npx mod-arch-installer my-module --flavor default
```

See [`docs/install.md`](./docs/install.md) for all CLI options and details about the PatternFly-first default flavor.

## OpenAPI Specification

The canonical OpenAPI 3.0 contract is in [`api/openapi/agent-ops.yaml`](./api/openapi/agent-ops.yaml). Contract tests load this file; the BFF serves a synced copy at runtime.

When the BFF is running locally (`make dev-bff` from `packages/agent-ops/`):

| URL | Purpose |
|-----|---------|
| `http://localhost:4000/mod-arch/swagger-ui` | Interactive API docs |
| `http://localhost:4000/mod-arch/openapi.json` | Machine-readable spec |
| `http://localhost:4000/mod-arch/openapi.yaml` | YAML spec |

After changing the canonical spec, run `make sync-openapi` from `packages/agent-ops/bff/` (or `make run`, which syncs automatically). CI and `npm run test:contract` fail if `api/openapi/agent-ops.yaml` and `bff/openapi/src/agent-ops.yaml` drift apart.

[Open the spec in Swagger Editor](https://editor.swagger.io/?url=https://raw.githubusercontent.com/opendatahub-io/odh-dashboard/main/packages/agent-ops/api/openapi/agent-ops.yaml)

## Targeted environments

There are two main deployment modes that the Agent Ops UI supports:

1. **Standalone**: This is the default environment for local development. The UI is served by the BFF and the BFF is responsible for serving the API requests. The BFF exposes a `/namespace` endpoint that returns all the namespaces in the cluster.

2. **Federated**: This is the environment where the UI is served as a micro-frontend and integrated with a host application.

## Environment Variables

The following environment variables are used to configure the deployment and development environment for the Agent Ops UI. These variables should be defined in a `.env.local` file in the `clients/ui` directory of the project. **This values will affect the build and push commands**.

### `CONTAINER_TOOL`

- **Description**: Specifies the container tool to be used for building and running containers.
- **Default Value**: `docker`
- **Possible Values**: `docker`, `podman`, etc.
- **Example**: `CONTAINER_TOOL=docker`

### `IMG_UI`

- **Description**: Specifies the image name and tag for the UI (with BFF).
- **Default Value**: `ghcr.io/your-org/agent-ops/ui:latest`
- **Example**: `IMG_UI=ghcr.io/your-org/agent-ops/ui:latest`

### `IMG_UI_STANDALONE`

- **Description**: Specifies the image name and tag for the UI (with BFF) in **standalone mode**, used for local kind deployment.
- **Default Value**: `ghcr.io/your-org/agent-ops/ui-standalone:latest`
- **Example**: `IMG_UI_STANDALONE=ghcr.io/your-org/agent-ops/ui-standalone:latest`

### `IMG_UI_FEDERATED`

- **Description**: Specifies the image name and tag for the UI (with BFF) in **federated mode**, used for federated mode outside kubeflow.
- **Default Value**: `ghcr.io/your-org/agent-ops/ui-federated:latest`
- **Example**: `IMG_UI_FEDERATED=ghcr.io/your-org/agent-ops/ui-federated:latest`

### `PLATFORM`

- **Description**: Specifies the platform for a **docker buildx** build.
- **Default Value**: `linux/amd64`
- **Example**: `PLATFORM=linux/amd64`

### `DEPLOYMENT_MODE`

- **Description**: Specifies the deployment mode for the UI.
- **Default Value**: `standalone`
- **Note**: This variable is used to determine how the UI is built and deployed.
- **Possible Values**: `standalone`, `federated`
- **Example**: `DEPLOYMENT_MODE=standalone`

### `STYLE_THEME`

- **Description**: Specifies the theme/styling framework to be used for the UI.
- **Default Value**: `patternfly-theme`
- **Possible Values**: `patternfly-theme`
- **Example**: `STYLE_THEME=patternfly-theme`

### Example `.env.local` File

Here is an example of what your `.env.local` file might look like:

```shell
CONTAINER_TOOL=docker
IMG_UI=quay.io/<personal-registry>/agent-ops-ui:latest
IMG_UI_STANDALONE=quay.io/<personal-registry>/agent-ops-ui-standalone:latest
PLATFORM=linux/amd64
```

## Build and Push Commands

The following Makefile targets are used to build and push the Docker images the UI images. These targets utilize the environment variables defined in the `.env.local` file.

### Build Commands

- **`docker-build`**: Builds the Docker image for the UI platform.
  - Command: `make docker-build`
  - This command uses the `CONTAINER_TOOL` and `IMG_UI` environment variables to push the image.

- **`docker-buildx`**: Builds the Docker image with buildX for multiarch support.
  - Command: `make docker-buildx`
  - This command uses the `CONTAINER_TOOL` and `IMG_UI` environment variables to push the image.

- **`docker-build-standalone`**: Builds the Docker image for the UI platform **in standalone mode**.
  - Command: `make docker-build-standalone`
  - This command uses the `CONTAINER_TOOL` and `IMG_UI_STANDALONE` environment variables to push the image.

- **`docker-buildx-standalone`**: Builds the Docker image with buildX for multiarch support **in standalone mode**.
  - Command: `make docker-buildx-standalone`
  - This command uses the `CONTAINER_TOOL` and `IMG_UI_STANDALONE` environment variables to push the image.

### Push Commands

- **`docker-push`**: Pushes the Docker image for the UI service to the container registry.
  - Command: `make docker-push`
  - This command uses the `CONTAINER_TOOL` and `IMG_UI` environment variables to push the image.

- **`docker-push-standalone`**: Pushes the Docker image for the UI service to the container registry **in standalone mode**.
  - Command: `make docker-push-standalone`
  - This command uses the `CONTAINER_TOOL` and `IMG_UI_STANDALONE` environment variables to push the image.

## Deployments

For more information on how to deploy the Agent Ops UI, please refer to the [Mod arch UI] documentation.

[Mod arch UI]: ./docs/README.md
[contributing guidelines]: ./CONTRIBUTING.md
