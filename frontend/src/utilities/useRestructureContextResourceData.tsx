import React from 'react';
import { FetchState } from '~/utilities/useFetchState';
import { ContextResourceData } from '~/types';

const useRestructureContextResourceData = <T,>(
  resourceData: FetchState<T[]>,
): ContextResourceData<T> => {
  const [data, loaded, error, refresh] = resourceData;
  return React.useMemo(
    () => ({
      data,
      loaded,
      error,
      refresh,
    }),
    [data, error, loaded, refresh],
  );
};

export default useRestructureContextResourceData;
