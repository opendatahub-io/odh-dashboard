import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { isModelServingCompatibleConnectionType } from '~/concepts/connectionTypes/utils';
import { fetchConnectionTypes } from '~/services/connectionTypesService';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';

export const useWatchConnectionTypes = (
  modelServingCompatible?: boolean,
): FetchState<ConnectionTypeConfigMapObj[]> => {
  const isOciEnabled = useIsAreaAvailable(SupportedArea.K_SERVE_OCI).status;

  const callback = React.useCallback<
    FetchStateCallbackPromise<ConnectionTypeConfigMapObj[]>
  >(async () => {
    let connectionTypes = await fetchConnectionTypes();
    if (modelServingCompatible) {
      connectionTypes = connectionTypes.filter(isModelServingCompatibleConnectionType);
    }
    if (!isOciEnabled) {
      connectionTypes = connectionTypes.filter((ct) => ct.metadata.name !== 'oci-v1');
    }

    return connectionTypes;
  }, [modelServingCompatible, isOciEnabled]);

  return useFetchState<ConnectionTypeConfigMapObj[]>(callback, []);
};
