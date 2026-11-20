import { isK8sStatus, K8sStatusError } from '@openshift/dynamic-plugin-sdk-utils';

const optionalMissingResources = [
  '/apis/template.openshift.io/v1/namespaces/',
  '/apis/infrastructure.opendatahub.io/v1/namespaces/',
];

/** Same-origin Kubernetes transport. The SDK requires non-successful requests to reject. */
export const k8sFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  const response = await fetch(`/api/k8s${url}`, options);
  if (
    response.status === 404 &&
    (!options?.method || options.method.toUpperCase() === 'GET') &&
    optionalMissingResources.some((resourcePath) => url.startsWith(resourcePath))
  ) {
    return new Response(JSON.stringify({ apiVersion: 'v1', kind: 'List', items: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    if (isK8sStatus(body)) {
      throw new K8sStatusError(body);
    }
    throw new Error(`Kubernetes request failed (HTTP ${response.status})`);
  }
  return response;
};
