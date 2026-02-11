/**
 * MLflow route constants and helpers.
 *
 * Slim version of the old routes/pipelines/mlflowExperiments.ts.
 * Only keeps what's needed for the module federation integration --
 * iframe-specific utilities (path sync, history patching, etc.) are removed.
 */

export const MLFLOW_EXPERIMENTS_ROUTE = '/develop-train/experiments-mlflow';
export const MLFLOW_PROXY_BASE_PATH = '/mlflow';
export const WORKSPACE_QUERY_PARAM = 'workspace';

export const mlflowExperimentsBaseRoute = (namespace?: string): string =>
  !namespace
    ? MLFLOW_EXPERIMENTS_ROUTE
    : `${MLFLOW_EXPERIMENTS_ROUTE}/experiments?${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(
        namespace,
      )}`;
