import {
  promptManagementPath,
  WORKSPACE_QUERY_PARAM,
} from '@odh-dashboard/internal/routes/pipelines/mlflow';

export const agentObservabilityPath = '/observe-and-monitor/agent-observability';
export const globAgentObservabilityAll = `${agentObservabilityPath}/*`;

export const withWorkspace = (basePath: string, namespace?: string): string => {
  if (!namespace) {
    return basePath;
  }
  const separator = basePath.includes('?') ? '&' : '?';
  return `${basePath}${separator}${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(namespace)}`;
};

export const agentObservabilityBaseRoute = (namespace?: string): string =>
  withWorkspace(agentObservabilityPath, namespace);

export const mlflowPromptRoute = (
  promptName: string,
  namespace?: string,
  promptVersion?: string,
): string => {
  const params = new URLSearchParams();
  if (promptVersion) {
    params.set('promptVersion', promptVersion);
  }
  if (namespace) {
    params.set(WORKSPACE_QUERY_PARAM, namespace);
  }
  const queryString = params.toString();
  return `${promptManagementPath}/prompts/${encodeURIComponent(promptName)}${
    queryString ? `?${queryString}` : ''
  }`;
};
