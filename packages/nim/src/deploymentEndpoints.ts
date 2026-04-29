import type { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
// eslint-disable-next-line no-restricted-syntax
import {
  getUrlFromKserveInferenceService,
  isInferenceServiceRouteEnabled,
} from '@odh-dashboard/internal/pages/modelServing/screens/projects/utils';
import type { DeploymentEndpoint } from '@odh-dashboard/model-serving/extension-points';

/**
 * Extract endpoints from the InferenceService created by the NIM Operator.
 * The NIM Operator creates a standard InferenceService, so endpoint extraction
 * follows the same pattern as KServe.
 */
export const getNIMDeploymentEndpoints = (
  inferenceService: InferenceServiceKind | undefined,
): DeploymentEndpoint[] => {
  if (!inferenceService) {
    return [];
  }

  const endpoints: DeploymentEndpoint[] = [];

  if (inferenceService.status?.address?.url) {
    endpoints.push({
      name: 'Internal',
      description: 'Accessible only from inside the cluster.',
      type: 'internal',
      url: inferenceService.status.address.url,
    });
  } else {
    endpoints.push({
      name: 'Internal',
      description: 'Accessible only from inside the cluster.',
      type: 'internal',
      url: '',
      error: 'Could not find any internal service enabled',
    });
  }

  if (isInferenceServiceRouteEnabled(inferenceService)) {
    const routeUrl = getUrlFromKserveInferenceService(inferenceService);
    if (routeUrl) {
      endpoints.push({
        type: 'external',
        url: routeUrl,
      });
    } else {
      endpoints.push({
        type: 'external',
        url: '',
        error: 'Route not found',
      });
    }
  }

  return endpoints;
};
