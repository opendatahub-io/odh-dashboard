import * as React from 'react';
import {
  FetchStateCallbackPromise,
  FetchStateObject,
  NotReadyError,
  useFetchState,
} from 'mod-arch-core';
import { ExternalVectorStoreSummary } from '~/app/types';
import { useGenAiAPI } from './useGenAiAPI';

const useFetchAAEVectorStores = (): FetchStateObject<ExternalVectorStoreSummary[]> => {
  const { api, apiAvailable } = useGenAiAPI();

  const fetchVectorStores = React.useCallback<
    FetchStateCallbackPromise<ExternalVectorStoreSummary[]>
  >(async () => {
    if (!apiAvailable) {
      return Promise.reject(new NotReadyError('API not yet available'));
    }
    const stores = await api.getAAVectorStores();
    return Array.isArray(stores) ? stores : [];
  }, [api, apiAvailable]);

  const [data, loaded, error, refresh] = useFetchState(fetchVectorStores, [], {
    initialPromisePurity: true,
  });
  return { data, loaded, error, refresh };
};

export default useFetchAAEVectorStores;
