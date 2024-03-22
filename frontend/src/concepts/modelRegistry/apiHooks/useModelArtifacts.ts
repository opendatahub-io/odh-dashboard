import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { ModelArtifactList } from '~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '~/concepts/modelRegistry/context/ModelRegistryContext';

const useModelArtifacts = (): FetchState<ModelArtifactList> => {
  const { api, apiAvailable } = useModelRegistryAPI();
  const callback = React.useCallback<FetchStateCallbackPromise<ModelArtifactList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }
      return api.listModelArtifacts(opts).then((r) => r);
    },
    [api, apiAvailable],
  );
  return useFetchState(
    callback,
    { items: [], size: 0, pageSize: 0, nextPageToken: '' },
    { initialPromisePurity: true },
  );
};

export default useModelArtifacts;
