import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';
import { RegisteredModel } from '#~/concepts/modelRegistry/types';
import { ModelRegistryPageContext } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

const useRegisteredModelById = (registeredModel?: string): FetchState<RegisteredModel | null> => {
  const { apiState } = React.useContext(ModelRegistryPageContext);

  const call = React.useCallback<FetchStateCallbackPromise<RegisteredModel | null>>(
    (opts) => {
      if (!registeredModel) {
        return Promise.reject(new NotReadyError('No registered model id'));
      }

      return apiState.api.getRegisteredModel(opts, registeredModel);
    },
    [apiState.api, registeredModel],
  );

  return useFetchState(call, null);
};

export default useRegisteredModelById;
