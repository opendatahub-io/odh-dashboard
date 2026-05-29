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

const withWorkspace = (basePath: string, namespace?: string): string => {
  if (!namespace) {
    return basePath;
  }
  return `${basePath}?${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(namespace)}`;
};

export const mlflowExperimentsBaseRoute = (namespace?: string): string =>
  withWorkspace(mlflowExperimentsPath, namespace);

export const mlflowExperimentRoute = (experimentId: string, namespace?: string): string =>
  withWorkspace(`${mlflowExperimentsPath}/${encodeURIComponent(experimentId)}`, namespace);

export const promptManagementPath = '/gen-ai-studio/prompts';
export const globPromptManagementAll = `${promptManagementPath}/*`;

export const mlflowPromptManagementBaseRoute = (namespace?: string): string =>
  withWorkspace(promptManagementPath, namespace);

export const mlflowLaunchRoute = (namespace?: string): string => {
  if (!namespace) {
    return MLFLOW_PROXY_BASE_PATH;
  }
  return `${MLFLOW_PROXY_BASE_PATH}/#/?${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(namespace)}`;
};
