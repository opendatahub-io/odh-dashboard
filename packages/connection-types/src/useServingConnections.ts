import React from 'react';
import type { Connection } from '@odh-dashboard/k8s-core';
import { isModelServingCompatible } from '@odh-dashboard/k8s-core';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import {
  isConnectionTypesServiceExtension,
  type ConnectionTypesServiceExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetchState';

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
    if (!fetchFn) {
      throw new NotReadyError('Connections extension not resolved');
    }
    if (!namespace) {
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
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- extension boundary: payload shape is not guaranteed at runtime
          c.metadata?.annotations?.['opendatahub.io/connection-hidden'] !== 'true',
      )
      .filter((c) => skipCompatibilityCheck || isModelServingCompatible(c));
  }, [fetchFn, namespace, includeDashboardFalse, skipCompatibilityCheck]);

  return useFetchState<Connection[]>(callback, []);
};

export default useServingConnections;
