import { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import {
  getUrlFromKserveInferenceService,
  isInferenceServiceRouteEnabled,
} from '@odh-dashboard/internal/pages/modelServing/screens/projects/utils';
import { DeploymentEndpoint } from '@odh-dashboard/model-serving/extension-points';

export const getKServeDeploymentEndpoints = (
  inferenceService: InferenceServiceKind,
): DeploymentEndpoint[] => {
  const endpoints: DeploymentEndpoint[] = [];
  if (inferenceService.status?.address?.url) {
    endpoints.push({
      name: 'url',
      type: 'internal',
      url: inferenceService.status.address.url,
    });
  } else {
    endpoints.push({
      name: 'url',
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
