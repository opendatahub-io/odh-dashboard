import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';
import { ModelVersionList } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

const useModelVersions = (): FetchState<ModelVersionList> => {
  const { api, apiAvailable } = useModelRegistryAPI();
  const callback = React.useCallback<FetchStateCallbackPromise<ModelVersionList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }
      return api.listModelVersions(opts).then((r) => r);
    },
    [api, apiAvailable],
  );
  return useFetchState(
    callback,
    { items: [], size: 0, pageSize: 0, nextPageToken: '' },
    { initialPromisePurity: true },
  );
};

export default useModelVersions;
