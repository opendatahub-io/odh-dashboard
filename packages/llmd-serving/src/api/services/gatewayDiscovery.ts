import React from 'react';
import { proxyGET } from '@odh-dashboard/internal/api/proxyUtils';
import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import useFetch, {
  NotReadyError,
  type FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';

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
  if (!('name' in value) || typeof value.name !== 'string') {
    return false;
  }
  if (!('namespace' in value) || typeof value.namespace !== 'string') {
    return false;
  }
  return true;
};

type GatewayResponse = {
  gateways: GatewayOption[];
};

type ProxyErrorResponse = {
  statusCode: number;
  error: string;
  message: string;
};

const isProxyErrorResponse = (
  response: GatewayResponse | ProxyErrorResponse,
): response is ProxyErrorResponse => 'statusCode' in response;

export const getGatewayOptions = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<GatewayOption[]> => {
  const response = await proxyGET<GatewayResponse | ProxyErrorResponse>(
    '/api/service/model-serving',
    '/api/v1/gateways',
    { namespace },
    opts,
  );
  if (isProxyErrorResponse(response)) {
    throw new Error('Gateway discovery failed.');
  }
  if (!Array.isArray(response.gateways)) {
    throw new Error('Invalid response from gateway discovery API.');
  }
  if (!response.gateways.every(isGatewayOption)) {
    throw new Error('Invalid response from gateway discovery API.');
  }
  return response.gateways;
};

export const useGetGatewayOptions = (namespace?: string): FetchStateObject<GatewayOption[]> => {
  const fetchCallbackPromise = React.useCallback(
    async (opts: K8sAPIOptions) => {
      if (namespace === undefined) {
        return Promise.reject(new NotReadyError('Namespace is required'));
      }

      return getGatewayOptions(namespace, opts);
    },
    [namespace],
  );
  return useFetch(fetchCallbackPromise, []);
};
