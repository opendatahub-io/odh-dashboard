import React from 'react';
import type { ConnectionTypeConfigMapObj } from '@odh-dashboard/k8s-core';
import { isConnectionType, isModelServingCompatible } from '@odh-dashboard/k8s-core';
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

export const useWatchConnectionTypes = (
  modelServingCompatible?: boolean,
): FetchState<ConnectionTypeConfigMapObj[]> => {
  const [serviceExtensions, resolved] = useResolvedExtensions<ConnectionTypesServiceExtension>(
    isConnectionTypesServiceExtension,
  );

  const fetchFn = resolved ? serviceExtensions[0]?.properties.fetchConnectionTypes : undefined;

  const callback = React.useCallback<
    FetchStateCallbackPromise<ConnectionTypeConfigMapObj[]>
  >(async () => {
    if (!fetchFn) {
      throw new NotReadyError('Connection types extension not resolved');
    }
    const result = await fetchFn();
    if (!Array.isArray(result)) {
      return [];
    }
    let connectionTypes = result.filter(isConnectionType);
    if (modelServingCompatible) {
      connectionTypes = connectionTypes.filter((ct) => isModelServingCompatible(ct));
    }
    return connectionTypes;
  }, [fetchFn, modelServingCompatible]);

  return useFetchState<ConnectionTypeConfigMapObj[]>(callback, []);
};
