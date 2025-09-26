import * as React from 'react';
import { useFetchState, FetchStateObject, FetchStateCallbackPromise } from 'mod-arch-core';
import { AAModelResponse, AIModel } from '~/app/types';
import { getAAModels } from '~/app/services/llamaStackService';

const useFetchAIModels = (namespace?: string): FetchStateObject<AIModel[]> => {
  const fetchAIModels = React.useCallback<FetchStateCallbackPromise<AIModel[]>>(async () => {
    if (!namespace) {
      return Promise.reject(new Error('No namespace provided'));
    }
    const rawData = await getAAModels(namespace);

    return rawData.map((item: AAModelResponse) => {
      // Parse endpoints into usable format
      const internalEndpoint = item.endpoints
        .find((endpoint) => endpoint.startsWith('internal:'))
        ?.replace('internal:', '')
        .trim();
      const externalEndpoint = item.endpoints
        .find((endpoint) => endpoint.startsWith('external:'))
        ?.replace('external:', '')
        .trim();

      return {
        ...item,
        internalEndpoint,
        externalEndpoint,
      };
    });
  }, [namespace]);

  const [data, loaded, error, refresh] = useFetchState(fetchAIModels, [], {
    initialPromisePurity: true,
  });

  return { data, loaded, error, refresh };
};

export default useFetchAIModels;
