/**
 * MLflow route constants and helpers.
 *
 * Route hierarchy:
 *   /develop-train/mlflow — redirects to experiments
 *   /develop-train/mlflow/experiments — Experiments list / detail
 *   /gen-ai-studio/prompts — Prompt management
 */

export const mlflowRootPath = '/develop-train/mlflow';
export const mlflowExperimentsPath = `${mlflowRootPath}/experiments`;
export const globMlflowAll = `${mlflowRootPath}/*`;

export const MLFLOW_PROXY_BASE_PATH = '/mlflow';
export const WORKSPACE_QUERY_PARAM = 'workspace';

export const mlflowExperimentsBaseRoute = (namespace?: string): string =>
  !namespace
    ? mlflowExperimentsPath
    : `${mlflowExperimentsPath}?${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(namespace)}`;

export const promptManagementPath = '/gen-ai-studio/prompts';
export const globPromptManagementAll = `${promptManagementPath}/*`;

export const mlflowPromptManagementBaseRoute = (namespace?: string): string =>
  !namespace
    ? promptManagementPath
    : `${promptManagementPath}?${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(namespace)}`;
