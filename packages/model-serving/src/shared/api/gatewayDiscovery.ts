import { mergeRequestInit, type K8sAPIOptions } from '@odh-dashboard/k8s-core';

export type GatewayOption = {
  name: string;
  namespace: string;
  listener?: string; // Listener should be available from API but not from a gateway Ref
  status?: 'Ready' | 'NotReady' | 'Unknown'; // Same deal as listener status ^
  displayName?: string;
  description?: string;
};

export const isGatewayOption = (value: unknown): value is GatewayOption => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (!('name' in value) || typeof value.name !== 'string' || !value.name.trim()) {
    return false;
  }
  if (!('namespace' in value) || typeof value.namespace !== 'string' || !value.namespace.trim()) {
    return false;
  }
  return (
    ['listener', 'displayName', 'description'].every(
      (key) => Reflect.get(value, key) === undefined || typeof Reflect.get(value, key) === 'string',
    ) &&
    (!('status' in value) ||
      value.status === undefined ||
      (typeof value.status === 'string' && ['Ready', 'NotReady', 'Unknown'].includes(value.status)))
  );
};

export const getGatewayOptions = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<GatewayOption[]> => {
  if (!namespace.trim()) {
    throw new Error('Namespace is required for gateway discovery.');
  }
  const httpResponse = await fetch(
    `/api/service/model-serving/api/v1/gateways?${new URLSearchParams({ namespace }).toString()}`,
    mergeRequestInit(opts, { method: 'GET' }),
  );
  if (!httpResponse.ok) {
    throw new Error('Gateway discovery failed.');
  }
  const response: unknown = await httpResponse.json().catch((error: unknown) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError'
    ) {
      throw error;
    }
    throw new Error('Invalid response from gateway discovery API.');
  });
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid response from gateway discovery API.');
  }
  if ('statusCode' in response) {
    throw new Error('Gateway discovery failed.');
  }
  if (!('gateways' in response) || !Array.isArray(response.gateways)) {
    throw new Error('Invalid response from gateway discovery API.');
  }
  if (!response.gateways.every(isGatewayOption)) {
    throw new Error('Invalid response from gateway discovery API.');
  }
  return response.gateways;
};
