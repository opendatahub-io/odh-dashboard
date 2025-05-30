import React from 'react';
import { ConnectionTypeConfigMapObj } from '#~/concepts/connectionTypes/types';
import { isModelServingCompatible } from '#~/concepts/connectionTypes/utils';
import { fetchConnectionTypes } from '#~/services/connectionTypesService';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '#~/utilities/useFetchState';

export const useWatchConnectionTypes = (
  modelServingCompatible?: boolean,
): FetchState<ConnectionTypeConfigMapObj[]> => {
  const callback = React.useCallback<
    FetchStateCallbackPromise<ConnectionTypeConfigMapObj[]>
  >(async () => {
    let connectionTypes = await fetchConnectionTypes();
    if (modelServingCompatible) {
      connectionTypes = connectionTypes.filter((ct) => isModelServingCompatible(ct));
    }

    return connectionTypes;
  }, [modelServingCompatible]);

  return useFetchState<ConnectionTypeConfigMapObj[]>(callback, []);
};
