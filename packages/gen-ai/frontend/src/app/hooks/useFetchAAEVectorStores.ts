import * as React from 'react';
import {
  FetchStateCallbackPromise,
  FetchStateObject,
  NotReadyError,
  useFetchState,
} from 'mod-arch-core';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { ExternalVectorStoreSummary } from '~/app/types';
import { GRID } from '~/odh/extensions';
import { useGenAiAPI } from './useGenAiAPI';

const useFetchAAEVectorStores = (): FetchStateObject<ExternalVectorStoreSummary[]> => {
  const { api, apiAvailable } = useGenAiAPI();
  const [gridEnabled] = useFeatureFlag(GRID);

  const fetchVectorStores = React.useCallback<
    FetchStateCallbackPromise<ExternalVectorStoreSummary[]>
  >(async () => {
    if (!apiAvailable) {
      return Promise.reject(new NotReadyError('API not yet available'));
    }
    if (gridEnabled) {
      return [];
    }
    const stores = await api.getAAVectorStores();
    return Array.isArray(stores) ? stores : [];
  }, [api, apiAvailable, gridEnabled]);

  const [data, loaded, error, refresh] = useFetchState(fetchVectorStores, [], {
    initialPromisePurity: true,
  });
  return { data, loaded, error, refresh };
};

export default useFetchAAEVectorStores;
