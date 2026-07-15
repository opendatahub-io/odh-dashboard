import React from 'react';
import type { Connection } from '@odh-dashboard/k8s-core';
import { isModelServingCompatible } from '@odh-dashboard/k8s-core';
import {
  isConnectionTypesServiceExtension,
  type ConnectionTypesServiceExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import useFetchState, { FetchState, FetchStateCallbackPromise } from './useFetchState';

const useServingConnections = (
  namespace?: string,
  includeDashboardFalse?: boolean,
  skipCompatibilityCheck?: boolean,
): FetchState<Connection[]> => {
  const [serviceExtensions, resolved] = useResolvedExtensions<ConnectionTypesServiceExtension>(
    isConnectionTypesServiceExtension,
  );

  const fetchFn = resolved ? serviceExtensions[0]?.properties.fetchConnections : undefined;

  const callback = React.useCallback<FetchStateCallbackPromise<Connection[]>>(async () => {
    if (!fetchFn || !namespace) {
      return [];
    }
    const labelSelector = includeDashboardFalse ? undefined : 'opendatahub.io/dashboard=true';
    const connections = await fetchFn(namespace, labelSelector);
    if (!Array.isArray(connections)) {
      return [];
    }
    return connections
      .filter(
        (c) =>
          includeDashboardFalse ||
          c?.metadata?.annotations?.['opendatahub.io/connection-hidden'] !== 'true',
      )
      .filter((c) => skipCompatibilityCheck || isModelServingCompatible(c));
  }, [fetchFn, namespace, includeDashboardFalse, skipCompatibilityCheck]);

  return useFetchState<Connection[]>(callback, []);
};

export default useServingConnections;
