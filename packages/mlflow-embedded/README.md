# MLflow Embedded

Host-side extension package that embeds selected pages from the **external MLflow frontend** into the ODH dashboard. The external MLflow frontend is a separate application (not part of this monorepo) that exposes its UI components via Module Federation. This package provides the routing, navigation, and page chrome that wrap those remote components inside the dashboard.

## What this package does

- Registers the **Experiments** navigation item under "Develop and Train", locked to the Model training workflow type
- Registers the **Agent traces** navigation item under "Observe & monitor", locked to the GenAI workflow type
- Registers the **Skills** navigation item under "AI hub" (Tech Preview, behind the `skillRegistry` flag), which loads the MLflow Skill Registry component (`loadRemote('mlflowEmbedded/MlflowSkillRegistryWrapper')`)
- Loads the MLflow experiment tracking component from the external MLflow frontend via Module Federation (`loadRemote('mlflowEmbedded/MlflowExperimentWrapper')`)
- Provides project/workspace selection and breadcrumb navigation around the embedded component
- Redirects tabs the locked workflow type doesn't support (Prompts → Prompt management, GenAI tabs on Experiments → Agent traces)

## Components

| File                                       | Purpose                                                           |
| ------------------------------------------ | ----------------------------------------------------------------- |
| `extensions.ts`                            | Registers area, nav item, and route extensions with the dashboard |
| `GlobalMLflowExperimentsRoutes.tsx`        | Route handler with project/workspace selection                    |
| `MlflowExperimentsPage.tsx`                | Loads the federated MLflow experiment tracking component          |
| `GlobalMLflowAgentObservabilityRoutes.tsx` | Agent traces route handler with project/workspace selection       |
| `MlflowAgentObservabilityPage.tsx`         | `MlflowExperimentsPage` configured for the GenAI workflow type    |
| `GlobalMLflowSkillRegistryRoutes.tsx`      | Skills route handler with project/workspace selection             |
| `MlflowSkillRegistryPage.tsx`              | Loads the federated MLflow Skill Registry component               |

## Module Federation

This package uses the MF name `mlflowEmbedded`. The external MLflow frontend must expose its container under the same name so that `loadRemote('mlflowEmbedded/...')` can resolve correctly.

Workflow locking and unsupported-tab redirects require an MLflow image that includes [opendatahub-io/mlflow#395](https://github.com/opendatahub-io/mlflow/pull/395). See [docs/overview.md](docs/overview.md) for the wrapper props contract and redirect rules.

## Development

This package has no build step of its own -- its TSX files are compiled by the host dashboard's rspack. To develop:

1. Start the external MLflow frontend (dev server on `localhost:9300`)
2. Start the dashboard: `pnpm run dev` (from repo root)
3. Navigate to **Develop and Train > Experiments**, **Observe & monitor > Agent traces**, or **AI hub > Skills** in the dashboard

## Availability

Experiments and Agent traces remain in navigation when the MLflow Operator is disabled. Prompts remains reachable by direct URL for setup guidance. Dashboard administrators with `create` and either `update` or `patch` permission on the cluster-scoped MLflow custom resource see administrator setup guidance; everyone else sees user guidance. The pages show this guidance until the operator is enabled and an MLflow custom resource is available, including when no project exists.

If the MLflow status check fails before any successful response, the pages show a service-unavailable state instead of setup guidance. Later transient failures retain the last known availability state.

## Feature Flags

Prompts navigation and its task shortcut require Gen AI Studio (`genAiStudio` in `OdhDashboardConfig`) and the MLflow component to be `Managed`. Its direct route remains available for prompt links from Experiments and Agent traces. The Experiments Home task requires the MLflow component, while its navigation item remains visible for setup guidance. The **Skills** page requires the MLflow component to be `Managed` in the DataScienceCluster, `skillRegistry: true` in `OdhDashboardConfig` (Tech Preview, off by default), and an MLflow image that exposes `MlflowSkillRegistryWrapper` ([opendatahub-io/mlflow#411](https://github.com/opendatahub-io/mlflow/pull/411)). The MCP registry tab requires the MLflow component and the `mcpCatalog` and `mcpRegistry` flags.
