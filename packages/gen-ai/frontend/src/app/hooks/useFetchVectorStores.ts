import * as React from 'react';
import { FetchState, NotReadyError, useFetchState } from 'mod-arch-core';
import { getVectorStores } from '~/app/services/llamaStackService';
import { VectorStore } from '~/app/types';

const useFetchVectorStores = (namespace?: string): FetchState<VectorStore[]> => {
  const fetchData = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('Namespace not found'));
    }
    return getVectorStores(namespace);
  }, [namespace]);

  return useFetchState<VectorStore[]>(fetchData, []);
};

export default useFetchVectorStores;
