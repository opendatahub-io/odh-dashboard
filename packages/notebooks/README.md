# Running Notebooks Upstream with Open Data Hub (ODH) Integration

This guide outlines how to run the upstream Notebooks and integrate it with a local Open Data Hub (ODH) development environment.

## Prerequisites

1. **Start the ODH Backend:**
    Ensure your ODH backend server is running. Run in the root of the ODH project:

    ```bash
    npm run dev:backend
    ```

2. **Start the ODH Frontend:**
    The main ODH dashboard frontend application must also be running. Run in the root of the ODH project:

    ```bash
    npm run dev:frontend
    ```

    **Important:** Do not use `npm run start:dev:ext` for the ODH frontend when testing this upstream integration.

3. **Notebooks UI Requirements:**
    Ensure you have met the [frontend requirements] and [BFF requirements] for the Notebooks UI. You can run Notebooks in either **mocked mode** or **federated mode**. For testing ODH integration, use **federated mode**.

    ```bash
    cd packages/notebooks/upstream/developing
    make tilt-up
    ```

## Notebooks Setup

For detailed instructions on how to run the Notebooks itself (covering local deployment, Kubeflow development, etc.), please refer to the official [Notebooks Documentation](./upstream/README.md).

## ODH Integration Point

The integration of this upstream Notebooks with Open Data Hub is managed via plugin extensions. The primary extension definitions for this integration can be found in:
[./upstream/workspaces/frontend/src/odh/extensions.ts](./upstream/workspaces/frontend/src/odh/extensions.ts)

This file declares how the Notebooks UI components and routes are exposed to and loaded by the ODH dashboard.

## Docker Workspace Build

This package uses a workspace-aware Dockerfile to handle Module Federation dependencies properly. The `Dockerfile.workspace` file is designed to build federated modules that depend on workspace packages.

### Building the Docker Image

**Important:** The Docker build must be run from the repository root to access all workspace dependencies (frontend, backend, and shared packages):

```bash
# Ensure you're at the repository root
pwd  # should show the root of odh-dashboard

# Build the notebooks image
docker build --file ./packages/notebooks/Dockerfile.workspace --tag notebooks:latest .

# Build with custom module name (if using the template)
docker build --file ./packages/notebooks/Dockerfile.workspace --build-arg MODULE_NAME=notebooks --tag notebooks:latest .
```

### Running the Container

```bash
# Run the container
docker run -p 8080:8080 notebooks:latest

# Run with environment variables
docker run -p 8080:8080 -e DEPLOYMENT_MODE=production notebooks:latest
```

### Build Arguments

The Dockerfile supports several build arguments for customization:

- `MODULE_NAME`: Name of the module to build (default: notebooks)
- `UI_SOURCE_CODE`: Path to the UI source code (default: ./packages/${MODULE_NAME}/upstream/workspaces/frontend)
- `BFF_SOURCE_CODE`: Path to the BFF source code (default: ./packages/${MODULE_NAME}/upstream/workspaces/backend)
- `NODE_BASE_IMAGE`: Base image for Node.js build stage
- `GOLANG_BASE_IMAGE`: Base image for Go build stage
- `DISTROLESS_BASE_IMAGE`: Base image for final runtime stage

### Why Workspace-Aware Build?

This package uses Module Federation and depends on workspace packages like:

- `@odh-dashboard/plugin-core`
- `@odh-dashboard/internal`
- `@openshift/dynamic-plugin-sdk`

The workspace-aware Dockerfile ensures these dependencies are available during the build process by:

1. Installing workspace dependencies at the root level
2. Copying shared packages into the build context
3. Installing module-specific dependencies including federated modules
4. Building from the workspace context rather than module isolation

For more information about workspace Dockerfiles, see [docs/workspace-dockerfiles.md](../../docs/workspace-dockerfiles.md).
