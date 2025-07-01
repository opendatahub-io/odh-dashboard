# Running Model Registry Upstream with Open Data Hub (ODH) Integration

This guide outlines how to run the upstream Model Registry and integrate it with a local Open Data Hub (ODH) development environment.

## Prerequisites

1.  **Start the ODH Backend:**
    Ensure your ODH backend server is running. Navigate to the `backend` directory within your main Open Data Hub dashboard project and run:
    ```bash
    npm run start:dev
    ```

2.  **Start the ODH Frontend:**
    The main ODH dashboard frontend application must also be running. Navigate to the main Open Data Hub dashboard project root and run:
    ```bash
    npm run start:dev
    ```
    **Important:** Do not use `npm run start:dev:ext` for the ODH frontend when testing this upstream integration.

## Model Registry Setup

For detailed instructions on how to run the Model Registry itself (covering local deployment, Kubeflow development, etc.), please refer to the official [Model Registry Documentation](./upstream/kubeflow/model-registry/docs/README.md).

## ODH Integration Point

The integration of this upstream Model Registry with Open Data Hub is managed via plugin extensions. The primary extension definitions for this integration can be found in:
[./kubeflow/model-registry/frontend/src/extensions.ts](./upstream/kubeflow/model-registry/frontend/src/extensions.ts)

This file declares how the Model Registry UI components and routes are exposed to and loaded by the ODH dashboard.
