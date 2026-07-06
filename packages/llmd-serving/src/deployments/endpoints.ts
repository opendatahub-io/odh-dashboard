import type { DeploymentEndpoint } from '@odh-dashboard/model-serving/extension-points';
import type { LLMInferenceServiceKind } from '../types';

export const getLLMdDeploymentEndpoints = (
  llmInferenceService: LLMInferenceServiceKind,
): DeploymentEndpoint[] => {
  const endpoints: DeploymentEndpoint[] = [];

  // Use status.url (external) if available, otherwise fall back to status.addresses.
  if (llmInferenceService.status?.url) {
    endpoints.push({
      type: 'external',
      url: llmInferenceService.status.url,
    });
  } else if (llmInferenceService.status?.addresses) {
    for (const addr of llmInferenceService.status.addresses) {
      if (addr.url) {
        const isInternal = addr.url.includes('.svc.cluster.local');
        endpoints.push({
          type: isInternal ? 'internal' : 'external',
          url: addr.url,
        });
      }
    }
  }

  return endpoints;
};
