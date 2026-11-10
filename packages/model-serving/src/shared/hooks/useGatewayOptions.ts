import * as React from 'react';
import type { K8sAPIOptions } from '@odh-dashboard/k8s-core';
import useFetch, {
  NotReadyError,
  type FetchStateObject,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import { ModelServingDataContext } from '@odh-dashboard/model-serving/shared/contexts/ModelServingDataContext';
import type { GatewayOption } from '../api/gatewayDiscovery';

const EMPTY_GATEWAYS: GatewayOption[] = [];

export const useGetGatewayOptions = (namespace?: string): FetchStateObject<GatewayOption[]> => {
  const { getGatewayOptions } = React.useContext(ModelServingDataContext);
  const load = React.useCallback(
    (opts: K8sAPIOptions) => {
      if (!getGatewayOptions) {
        return Promise.resolve(EMPTY_GATEWAYS);
      }
      if (!namespace) {
        return Promise.reject(new NotReadyError('Namespace is required'));
      }
      return getGatewayOptions(namespace, opts);
    },
    [getGatewayOptions, namespace],
  );
  const state = useFetch(load, EMPTY_GATEWAYS, { initialPromisePurity: true });
  return getGatewayOptions
    ? state
    : { ...state, data: EMPTY_GATEWAYS, loaded: true, error: undefined };
};
