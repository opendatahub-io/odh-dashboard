import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';
import { ModelVersion } from '#~/concepts/modelRegistry/types';
import { ModelRegistryPageContext } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

const useModelVersionById = (modelVersionId?: string): FetchState<ModelVersion | null> => {
  const { apiState } = React.useContext(ModelRegistryPageContext);

  const call = React.useCallback<FetchStateCallbackPromise<ModelVersion | null>>(
    (opts) => {
      if (!modelVersionId) {
        return Promise.reject(new NotReadyError('No model version id'));
      }

      return apiState.api.getModelVersion(opts, modelVersionId);
    },
    [apiState.api, modelVersionId],
  );

  return useFetchState(call, null);
};

export default useModelVersionById;
