import * as React from 'react';
import type { K8sAPIOptions } from '@odh-dashboard/k8s-core';
import useFetch, {
  NotReadyError,
  type FetchStateObject,
} from '@odh-dashboard/ui-core/hooks/useFetch';

export type GatewayOption = {
  name: string;
  namespace: string;
  listener?: string;
  status?: 'Ready' | 'NotReady' | 'Unknown';
  displayName?: string;
  description?: string;
};

/** A fixed domain operation. Hosts cannot expose arbitrary services or paths through it. */
export type GatewayDiscoveryServices = {
  discoverGateways?: (namespace: string, opts?: Pick<K8sAPIOptions, 'signal'>) => Promise<unknown>;
};

export const GatewayDiscoveryContext = React.createContext<GatewayDiscoveryServices>({});

/** RHOAI and Core BFF implement this same fixed domain endpoint. */
export const gatewayDiscoveryServices: GatewayDiscoveryServices = {
  discoverGateways: async (namespace, opts) => {
    const query = new URLSearchParams({ namespace });
    const response = await fetch(`/api/service/model-serving/api/v1/gateways?${query.toString()}`, {
      method: 'GET',
      signal: opts?.signal,
      credentials: 'same-origin',
    });
    if (!response.ok) {
      throw new Error(`Gateway discovery failed (${response.status}).`);
    }
    return response.json();
  },
};

export const isGatewayOption = (value: unknown): value is GatewayOption => {
  if (
    !value ||
    typeof value !== 'object' ||
    !('name' in value) ||
    !('namespace' in value) ||
    typeof value.name !== 'string' ||
    !value.name ||
    typeof value.namespace !== 'string' ||
    !value.namespace
  ) {
    return false;
  }
  return (
    (!('listener' in value) ||
      value.listener === undefined ||
      typeof value.listener === 'string') &&
    (!('displayName' in value) ||
      value.displayName === undefined ||
      typeof value.displayName === 'string') &&
    (!('description' in value) ||
      value.description === undefined ||
      typeof value.description === 'string') &&
    (!('status' in value) ||
      value.status === undefined ||
      value.status === 'Ready' ||
      value.status === 'NotReady' ||
      value.status === 'Unknown')
  );
};

export const getGatewayOptions = async (
  { discoverGateways }: GatewayDiscoveryServices,
  namespace: string,
  opts?: Pick<K8sAPIOptions, 'signal'>,
): Promise<GatewayOption[]> => {
  if (!discoverGateways) {
    throw new Error('Gateway discovery is not available in this host.');
  }
  if (!/^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$/.test(namespace)) {
    throw new Error('A valid project namespace is required.');
  }
  const response = await discoverGateways(namespace, opts);
  if (
    !response ||
    typeof response !== 'object' ||
    !('gateways' in response) ||
    !Array.isArray(response.gateways) ||
    !response.gateways.every(isGatewayOption)
  ) {
    throw new Error('Invalid response from gateway discovery API.');
  }
  return response.gateways;
};

export const useGetGatewayOptions = (namespace?: string): FetchStateObject<GatewayOption[]> => {
  const { discoverGateways } = React.useContext(GatewayDiscoveryContext);
  const fetchCallback = React.useCallback(
    async (opts: K8sAPIOptions) => {
      if (!namespace) {
        throw new NotReadyError('Namespace is required');
      }
      return getGatewayOptions({ discoverGateways }, namespace, opts);
    },
    [discoverGateways, namespace],
  );
  return useFetch(fetchCallback, [], { initialPromisePurity: true });
};
