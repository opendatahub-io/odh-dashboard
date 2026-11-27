import { isK8sStatus, K8sStatusError } from '@odh-dashboard/k8s-core';

const optionalMissingResources = [
  '/apis/template.openshift.io/v1/namespaces/',
  '/apis/infrastructure.opendatahub.io/v1/namespaces/',
];

/**
 * Same-origin Kubernetes transport. The SDK requires non-successful requests to reject.
 * Status failures reject with k8s-core's `K8sStatusError`, as on the ODH frontend, so the
 * packages' status-code checks (a 404 before creating, a 403 on an optional read) apply.
 */
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
