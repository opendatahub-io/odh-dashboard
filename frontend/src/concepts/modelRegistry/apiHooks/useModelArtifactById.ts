import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { ModelArtifact } from '~/concepts/modelRegistry/types';

const useModelArtifactById = (modelArtifactId?: string): FetchState<ModelArtifact | null> => {
  const { apiState } = React.useContext(ModelRegistryContext);

  const call = React.useCallback<FetchStateCallbackPromise<ModelArtifact | null>>(
    (opts) => {
      if (!modelArtifactId) {
        return Promise.reject(new NotReadyError('No model artifact id'));
      }

      return apiState.api.getModelArtifact(opts, modelArtifactId);
    },
    [apiState.api, modelArtifactId],
  );

  return useFetchState(call, null);
};

export default useModelArtifactById;
