import * as React from 'react';
import { APIOptions, FetchState, NotReadyError, useFetchState } from 'mod-arch-core';
import { VectorStore } from '~/app/types';
import { useGenAiAPI } from './useGenAiAPI';

const useFetchVectorStores = (): FetchState<VectorStore[]> => {
  const { api, apiAvailable } = useGenAiAPI();
  const fetchData = React.useCallback(
    (opts: APIOptions) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }
      return api.listVectorStores(opts);
    },
    [api, apiAvailable],
  );

  return useFetchState<VectorStore[]>(fetchData, []);
};

export default useFetchVectorStores;
