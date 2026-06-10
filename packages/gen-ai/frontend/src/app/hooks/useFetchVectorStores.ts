import * as React from 'react';
import { APIOptions, FetchState, NotReadyError, useFetchState } from 'mod-arch-core';
import { VectorStore } from '~/app/types';
import { useGenAiAPI } from './useGenAiAPI';
import useChatPlaygroundEnabled from './useChatPlaygroundEnabled';

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

const isVectorStore = (v: unknown): v is VectorStore =>
  isRecord(v) && typeof v.id === 'string' && typeof v.name === 'string' && isRecord(v.metadata);

const useFetchVectorStores = (): FetchState<VectorStore[]> => {
  const { api, apiAvailable } = useGenAiAPI();
  const isChatPlaygroundEnabled = useChatPlaygroundEnabled();
  const fetchData = React.useCallback(
    (opts: APIOptions) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }
      if (!isChatPlaygroundEnabled) {
        return Promise.reject(new NotReadyError('Playground is not enabled'));
      }
      return api
        .listVectorStores(opts)
        .then((stores) => (Array.isArray(stores) ? stores : []).filter(isVectorStore));
    },
    [api, apiAvailable, isChatPlaygroundEnabled],
  );

  return useFetchState<VectorStore[]>(fetchData, []);
};

export default useFetchVectorStores;
