import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { RegisteredModel } from '~/concepts/modelRegistry/types';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';

const useRegisteredModelById = (registeredModel?: string): FetchState<RegisteredModel | null> => {
  const { apiState } = React.useContext(ModelRegistryContext);

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
