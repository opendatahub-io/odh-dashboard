import React from 'react';
import { ConnectionTypeConfigMapObj } from '#~/concepts/connectionTypes/types';
import { isModelServingCompatible, isAutoragCompatible } from '#~/concepts/connectionTypes/utils';
import { fetchConnectionTypes } from '#~/services/connectionTypesService';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '#~/utilities/useFetchState';

export const useWatchConnectionTypes = ({
  modelServingCompatible = false,
  autoragCompatible = false,
}: {
  modelServingCompatible?: boolean;
  autoragCompatible?: boolean;
} = {}): FetchState<ConnectionTypeConfigMapObj[]> => {
  const callback = React.useCallback<
    FetchStateCallbackPromise<ConnectionTypeConfigMapObj[]>
  >(async () => {
    let connectionTypes = await fetchConnectionTypes();
    if (modelServingCompatible) {
      connectionTypes = connectionTypes.filter((ct) => isModelServingCompatible(ct));
    }
    if (autoragCompatible) {
      connectionTypes = connectionTypes.filter((ct) => isAutoragCompatible(ct));
    }

    return connectionTypes;
  }, [modelServingCompatible, autoragCompatible]);

  return useFetchState<ConnectionTypeConfigMapObj[]>(callback, []);
};
