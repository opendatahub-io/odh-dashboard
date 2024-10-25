import React from 'react';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import {
  CompatibleTypes,
  getCompatibleTypes,
  isConnectionTypeDataField,
} from '~/concepts/connectionTypes/utils';
import { fetchConnectionTypes } from '~/services/connectionTypesService';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';

export const useWatchConnectionTypes = (
  modelServingCompatible?: boolean,
): FetchState<ConnectionTypeConfigMapObj[]> => {
  const callback = React.useCallback<
    FetchStateCallbackPromise<ConnectionTypeConfigMapObj[]>
  >(async () => {
    let connectionTypes = await fetchConnectionTypes();
    if (modelServingCompatible) {
      connectionTypes = connectionTypes.filter((type) => {
        const compatibleTypes = getCompatibleTypes(
          type.data?.fields?.filter(isConnectionTypeDataField).map((field) => field.envVar) ?? [],
        );

        return compatibleTypes.includes(CompatibleTypes.ModelServing);
      });
    }

    return connectionTypes;
  }, [modelServingCompatible]);

  return useFetchState<ConnectionTypeConfigMapObj[]>(callback, []);
};
