import React from 'react';
import { FetchState } from '~/utilities/useFetchState';
import { PendingContextResourceData } from '~/types';

const useRestructureContextResourceData = <T,>(
  resourceData: [...FetchState<T[]>, boolean],
): PendingContextResourceData<T> => {
  const [data, loaded, error, refresh, pending] = resourceData;
  return React.useMemo(
    () => ({
      data,
      loaded,
      error,
      refresh,
      pending,
    }),
    [data, error, loaded, refresh, pending],
  );
};

export default useRestructureContextResourceData;
