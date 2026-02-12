/**
 * MLflow route constants and helpers.
 *
 * Route hierarchy:
 *   /develop-train/mlflow                  — MLflow base (redirects to experiments)
 *   /develop-train/mlflow/experiments      — Experiments list / detail
 */

export const MLFLOW_BASE_ROUTE = '/develop-train/mlflow';
export const MLFLOW_EXPERIMENTS_ROUTE = `${MLFLOW_BASE_ROUTE}/experiments`;
export const MLFLOW_PROXY_BASE_PATH = '/mlflow';
export const WORKSPACE_QUERY_PARAM = 'workspace';

export const mlflowExperimentsBaseRoute = (namespace?: string): string =>
  !namespace
    ? MLFLOW_EXPERIMENTS_ROUTE
    : `${MLFLOW_EXPERIMENTS_ROUTE}?${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(namespace)}`;
