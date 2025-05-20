import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { ModelArtifactList } from '~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '~/concepts/modelRegistry/context/ModelRegistryPageContext';

const useModelArtifactsByVersionId = (modelVersionId?: string): FetchState<ModelArtifactList> => {
  const { api, apiAvailable } = useModelRegistryAPI();
  const callback = React.useCallback<FetchStateCallbackPromise<ModelArtifactList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }
      if (!modelVersionId) {
        return Promise.reject(new NotReadyError('No model registeredModel id'));
      }

      return api.getModelArtifactsByModelVersion(opts, modelVersionId);
    },
    [api, apiAvailable, modelVersionId],
  );

  return useFetchState(
    callback,
    { items: [], size: 0, pageSize: 0, nextPageToken: '' },
    { initialPromisePurity: true },
  );
};

export default useModelArtifactsByVersionId;
