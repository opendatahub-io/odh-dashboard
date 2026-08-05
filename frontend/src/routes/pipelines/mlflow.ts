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
  const separator = basePath.includes('?') ? '&' : '?';
  return `${basePath}${separator}${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(namespace)}`;
};

export const mlflowExperimentsBaseRoute = (namespace?: string): string =>
  withWorkspace(mlflowExperimentsPath, namespace);

export const SEARCH_FILTER_QUERY_PARAM = 'searchFilter';

export const mlflowExperimentRoute = (experimentId: string, namespace?: string): string => {
  const basePath = `${mlflowExperimentsPath}/${encodeURIComponent(experimentId)}/runs`;
  const params = new URLSearchParams();
  if (namespace) {
    params.set(WORKSPACE_QUERY_PARAM, namespace);
  }
  params.set(SEARCH_FILTER_QUERY_PARAM, '');
  return `${basePath}?${params.toString()}`;
};

export const mlflowRunRoute = (experimentId: string, runId: string, namespace?: string): string =>
  withWorkspace(
    `${mlflowExperimentsPath}/${encodeURIComponent(experimentId)}/runs/${encodeURIComponent(
      runId,
    )}`,
    namespace,
  );

export const promptManagementPath = '/gen-ai-studio/prompts';
export const globPromptManagementAll = `${promptManagementPath}/*`;

export const mlflowPromptManagementBaseRoute = (namespace?: string): string =>
  withWorkspace(promptManagementPath, namespace);

export const mlflowCompareRunsRoute = (
  namespace: string,
  runIds: string[],
  experimentIds: string[],
): string => {
  const params = new URLSearchParams();
  if (runIds.length > 0) {
    params.set('runs', JSON.stringify(runIds));
  }
  if (experimentIds.length > 0) {
    params.set('experiments', JSON.stringify(experimentIds));
  }
  const queryString = params.toString();
  const basePath = `${mlflowExperimentsPath}/compare-runs${queryString ? `?${queryString}` : ''}`;
  return withWorkspace(basePath, namespace);
};

export const mlflowLaunchRoute = (namespace?: string): string => {
  if (!namespace) {
    return MLFLOW_PROXY_BASE_PATH;
  }
  return `${MLFLOW_PROXY_BASE_PATH}/#/?${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(namespace)}`;
};
