import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { RegisteredModelList } from '~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '~/concepts/modelRegistry/context/ModelRegistryPageContext';

const useRegisteredModels = (): FetchState<RegisteredModelList> => {
  const { api, apiAvailable } = useModelRegistryAPI();
  const callback = React.useCallback<FetchStateCallbackPromise<RegisteredModelList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }
      return api.listRegisteredModels(opts).then((r) => r);
    },
    [api, apiAvailable],
  );
  return useFetchState(
    callback,
    { items: [], size: 0, pageSize: 0, nextPageToken: '' },
    { initialPromisePurity: true },
  );
};

export default useRegisteredModels;
