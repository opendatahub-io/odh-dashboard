import * as React from 'react';
import { useFetchState, FetchStateObject, FetchStateCallbackPromise } from 'mod-arch-core';
import { AIModel } from '~/app/AIAssets/types';
import { getAIModels } from '~/app/services/llamaStackService';

const useFetchAIModels = (namespace?: string): FetchStateObject<AIModel[]> => {
  const fetchAIModels = React.useCallback<FetchStateCallbackPromise<AIModel[]>>(async () => {
    if (!namespace) {
      return Promise.reject(new Error('No namespace provided'));
    }
    return getAIModels(namespace);
  }, [namespace]);

  const [data, loaded, error, refresh] = useFetchState(fetchAIModels, [], {
    initialPromisePurity: true,
  });

  return { data, loaded, error, refresh };
};

export default useFetchAIModels;
