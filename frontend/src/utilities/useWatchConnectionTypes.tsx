import React from 'react';
import {
  ConnectionTypeConfigMapObj,
  isConnectionTypeDataField,
} from '~/concepts/connectionTypes/types';
import { CompatibleTypes, getCompatibleTypes } from '~/concepts/connectionTypes/utils';
import { fetchConnectionTypes } from '~/services/connectionTypesService';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';

export const useWatchConnectionTypes = (
  modelServingCompatible?: boolean,
): FetchState<ConnectionTypeConfigMapObj[]> => {
  const callback = React.useCallback<
    FetchStateCallbackPromise<ConnectionTypeConfigMapObj[]>
  >(async () => {
    const secrets = await fetchConnectionTypes();

    let connectionTypes = secrets;
    if (modelServingCompatible) {
      connectionTypes = connectionTypes.filter((type) => {
        const compatibleTypes = getCompatibleTypes(
          type.data?.fields
            ?.filter(isConnectionTypeDataField)
            .filter((field) => field.required)
            .map((field) => field.envVar) ?? [],
        );

        return compatibleTypes.includes(CompatibleTypes.ModelServing);
      });
    }

    return connectionTypes;
  }, [modelServingCompatible]);

  return useFetchState<ConnectionTypeConfigMapObj[]>(callback, []);
};
