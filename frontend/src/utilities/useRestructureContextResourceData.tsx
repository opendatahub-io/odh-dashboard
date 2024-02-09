import React from 'react';
import { FetchState } from '~/utilities/useFetchState';
import { ContextResourceData } from '~/types';

const useRestructureContextResourceData = <T,>(
  resourceData: [...FetchState<T[]>, boolean],
): ContextResourceData<T> & { pending: boolean } => {
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
