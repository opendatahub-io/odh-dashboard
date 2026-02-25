# MLflow Embedded

Host-side extension package that embeds selected pages from the **external MLflow frontend** into the ODH dashboard. The external MLflow frontend is a separate application (not part of this monorepo) that exposes its UI components via Module Federation. This package provides the routing, navigation, and page chrome that wrap those remote components inside the dashboard.

## What this package does

- Registers the **Experiments (MLflow)** navigation item under "Develop and Train"
- Loads the MLflow experiment tracking component from the external MLflow frontend via Module Federation (`loadRemote('mlflowEmbedded/MlflowExperimentWrapper')`)
- Provides project/workspace selection and breadcrumb navigation around the embedded component

## Components

| File                                | Purpose                                                           |
| ----------------------------------- | ----------------------------------------------------------------- |
| `extensions.ts`                     | Registers area, nav item, and route extensions with the dashboard |
| `GlobalMLflowExperimentsRoutes.tsx` | Route handler with project/workspace selection                    |
| `MlflowExperimentsPage.tsx`         | Loads the federated MLflow experiment tracking component          |

## Module Federation

This package uses the MF name `mlflowEmbedded`. The external MLflow frontend must expose its container under the same name so that `loadRemote('mlflowEmbedded/...')` can resolve correctly.

## Development

This package has no build step of its own -- its TSX files are compiled by the host dashboard's webpack. To develop:

1. Start the external MLflow frontend (dev server on `localhost:9300`)
2. Start the dashboard: `npm run dev` (from repo root)
3. Navigate to **Develop and Train > Experiments (MLflow)** in the dashboard

## Feature Flags

The MLflow UI requires the `mlflow` and `ds-pipelines` feature flags to be enabled.
