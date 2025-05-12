import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { ModelVersionList } from '~/concepts/modelRegistry/types';
import { ModelRegistryPageContext } from '~/concepts/modelRegistry/context/ModelRegistryPageContext';

const useModelVersionsByRegisteredModel = (
  registeredModelId?: string,
): FetchState<ModelVersionList> => {
  const { apiState } = React.useContext(ModelRegistryPageContext);

  const call = React.useCallback<FetchStateCallbackPromise<ModelVersionList>>(
    (opts) => {
      if (!registeredModelId) {
        return Promise.reject(new NotReadyError('No model registeredModel id'));
      }

      return apiState.api.getModelVersionsByRegisteredModel(opts, registeredModelId);
    },
    [apiState.api, registeredModelId],
  );

  return useFetchState(
    call,
    { items: [], size: 0, pageSize: 0, nextPageToken: '' },
    { initialPromisePurity: true },
  );
};

export default useModelVersionsByRegisteredModel;
