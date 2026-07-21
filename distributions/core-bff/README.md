# Core BFF

## Overview

The Core BFF is a Go backend that replaces Fastify across both RHOAI (sidecar) and RHAII (standalone) deployments. It contains a Go backend (BFF) and a React frontend.

## Contributing

You can check the [contributing guidelines] for more information on how to contribute to the Core BFF.

## OpenAPI Specification

You can find the OpenAPI specification for the Core BFF in the [openapi](./bff/openapi/src) directory.

## Targeted environments

There are two main deployment modes that the Core BFF supports:

1. **Standalone**: This is the default environment for local development. The UI is served by the BFF and the BFF is responsible for serving the API requests. The BFF exposes a `/api/v1/namespaces` endpoint that returns all the namespaces in the cluster.

2. **Federated**: This is the environment where the UI is served as a micro-frontend and integrated with a host application.

## Environment Variables

The following environment variables are used to configure the deployment and development environment for the Core BFF. These variables should be defined in a `.env.local` file in the project root. **These values will affect the build and push commands**.

### `CONTAINER_TOOL`

- **Description**: Specifies the container tool to be used for building and running containers.
- **Default Value**: `docker`
- **Possible Values**: `docker`, `podman`, etc.
- **Example**: `CONTAINER_TOOL=docker`

### `IMG_UI`

- **Description**: Specifies the image name and tag for the UI (with BFF).
- **Default Value**: `quay.io/opendatahub/core-bff/ui:latest`
- **Example**: `IMG_UI=quay.io/opendatahub/core-bff/ui:latest`

### `IMG_UI_STANDALONE`

- **Description**: Specifies the image name and tag for the UI (with BFF) in **standalone mode**, used for local kind deployment.
- **Default Value**: `quay.io/opendatahub/core-bff/ui-standalone:latest`
- **Example**: `IMG_UI_STANDALONE=quay.io/opendatahub/core-bff/ui-standalone:latest`

### `IMG_UI_FEDERATED`

- **Description**: Specifies the image name and tag for the UI (with BFF) in **federated mode**, used for integration with the ODH/RHOAI dashboard.
- **Default Value**: `quay.io/opendatahub/core-bff/ui-federated:latest`
- **Example**: `IMG_UI_FEDERATED=quay.io/opendatahub/core-bff/ui-federated:latest`

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
IMG_UI=quay.io/<personal-registry>/core-bff-ui:latest
IMG_UI_STANDALONE=quay.io/<personal-registry>/core-bff-ui-standalone:latest
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

For more information on how to deploy the Core BFF, please refer to the [deployment documentation].

[deployment documentation]: ./docs/README.md
[contributing guidelines]: ./CONTRIBUTING.md
