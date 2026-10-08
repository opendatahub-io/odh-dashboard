# MLflow Embedded

Host-side extension package that embeds selected pages from the **external MLflow frontend** into the ODH dashboard. The external MLflow frontend is a separate application (not part of this monorepo) that exposes its UI components via Module Federation. This package provides the routing, navigation, and page chrome that wrap those remote components inside the dashboard.

## What this package does

- Registers the **Experiments** navigation item under "Develop and Train", locked to the Model training workflow type
- Registers the **Agent observability** navigation item under "Observe & monitor", locked to the GenAI workflow type
- Loads the MLflow experiment tracking component from the external MLflow frontend via Module Federation (`loadRemote('mlflowEmbedded/MlflowExperimentWrapper')`)
- Provides project/workspace selection and breadcrumb navigation around the embedded component
- Redirects tabs the locked workflow type doesn't support (Prompts → Prompt management, GenAI tabs on Experiments → Agent observability)

## Components

| File                                       | Purpose                                                            |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `extensions.ts`                            | Registers area, nav item, and route extensions with the dashboard  |
| `GlobalMLflowExperimentsRoutes.tsx`        | Route handler with project/workspace selection                     |
| `MlflowExperimentsPage.tsx`                | Loads the federated MLflow experiment tracking component           |
| `GlobalMLflowAgentObservabilityRoutes.tsx` | Agent observability route handler with project/workspace selection |
| `MlflowAgentObservabilityPage.tsx`         | `MlflowExperimentsPage` configured for the GenAI workflow type     |

## Module Federation

This package uses the MF name `mlflowEmbedded`. The external MLflow frontend must expose its container under the same name so that `loadRemote('mlflowEmbedded/...')` can resolve correctly.

Workflow locking and unsupported-tab redirects require an MLflow image that includes [opendatahub-io/mlflow#395](https://github.com/opendatahub-io/mlflow/pull/395). See [docs/overview.md](docs/overview.md) for the wrapper props contract and redirect rules.

## Development

This package has no build step of its own -- its TSX files are compiled by the host dashboard's rspack. To develop:

1. Start the external MLflow frontend (dev server on `localhost:9300`)
2. Start the dashboard: `pnpm run dev` (from repo root)
3. Navigate to **Develop and Train > Experiments** or **Observe & monitor > Agent observability** in the dashboard

## Feature Flags

The MLflow UI requires the `mlflow` and `ds-pipelines` feature flags to be enabled.
