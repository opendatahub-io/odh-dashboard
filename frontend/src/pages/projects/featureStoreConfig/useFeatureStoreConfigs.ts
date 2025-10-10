import * as React from 'react';
import useFetch, {
  FetchOptions,
  FetchStateObject,
  FetchStateCallbackPromise,
} from '#~/utilities/useFetch';
import { fetchFeatureStoreConfigurationsFromWorkbench } from './service';
import { FeatureStoreConfigurationsResult } from './types';

const useFeatureStoreConfigs = (
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<FeatureStoreConfigurationsResult> => {
  const callback = React.useCallback<
    FetchStateCallbackPromise<FeatureStoreConfigurationsResult>
  >(async () => {
    return fetchFeatureStoreConfigurationsFromWorkbench();
  }, []);

  return useFetch(callback, { clientConfigs: [], namespaces: [] }, fetchOptions);
};

export default useFeatureStoreConfigs;
