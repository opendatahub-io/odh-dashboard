/**
 * MLflow route constants and helpers.
 *
 * Route hierarchy:
 *   /develop-train/mlflow — redirects to experiments
 *   /develop-train/mlflow/experiments — Experiments list / detail
 *   /gen-ai-studio/prompts — Prompt management
 */

import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';

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

export const mlflowExperimentRoute = (experimentId: string, namespace?: string): string =>
  withWorkspace(`${mlflowExperimentsPath}/${encodeURIComponent(experimentId)}`, namespace);

export const promptManagementPath = '/gen-ai-studio/prompts';
export const globPromptManagementAll = `${promptManagementPath}/*`;

export const mlflowPromptManagementBaseRoute = (namespace?: string): string =>
  withWorkspace(promptManagementPath, namespace);

export const getMlflowExperimentId = (run: PipelineRunKF): string | undefined => {
  const outputEntry = run.plugins_output?.mlflow?.entries;
  const outputId = outputEntry?.experiment_id?.value;
  if (outputId != null) {
    return String(outputId);
  }
  const inputId = run.plugins_input?.mlflow?.experiment_id;
  if (inputId != null) {
    return String(inputId);
  }
  return undefined;
};

export const getMlflowRunId = (run: PipelineRunKF): string | undefined => {
  const outputEntry = run.plugins_output?.mlflow?.entries;
  const outputId = outputEntry?.root_run_id?.value;
  if (outputId != null) {
    return String(outputId);
  }
  return undefined;
};

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
