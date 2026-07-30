import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetchState';
import { ConnectionTypeConfigMapObj } from '#~/concepts/connectionTypes/types';
import { fetchConnectionType } from '#~/services/connectionTypesService';

export const useConnectionType = (
  name?: string,
): FetchState<ConnectionTypeConfigMapObj | undefined> => {
  const fetchData = React.useCallback<FetchStateCallbackPromise<ConnectionTypeConfigMapObj>>(() => {
    if (!name) {
      return Promise.reject(new NotReadyError('No connection type name'));
    }

    return fetchConnectionType(name);
  }, [name]);

  return useFetchState(fetchData, undefined);
};
