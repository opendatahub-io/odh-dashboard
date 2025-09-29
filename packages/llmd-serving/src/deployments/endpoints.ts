import type { DeploymentEndpoint } from '@odh-dashboard/model-serving/extension-points';
import type { LLMInferenceServiceKind } from '../types';

export const getLLMdDeploymentEndpoints = (
  llmInferenceService: LLMInferenceServiceKind,
): DeploymentEndpoint[] => {
  const endpoints: DeploymentEndpoint[] = [];

  // `status.url` is the public facing URL (from the gateway)
  if (llmInferenceService.status?.url) {
    endpoints.push({
      type: 'external',
      url: llmInferenceService.status.url,
    });
  }

  return endpoints;
};
