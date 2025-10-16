import * as React from 'react';
import { useFetchState, FetchStateObject, FetchStateCallbackPromise } from 'mod-arch-core';
import { AAModelResponse, AIModel } from '~/app/types';
import { getAAModels, getMaaSModels } from '~/app/services/llamaStackService';

const useFetchAIModels = (namespace?: string): FetchStateObject<AIModel[]> => {
  const fetchAIModels = React.useCallback<FetchStateCallbackPromise<AIModel[]>>(async () => {
    if (!namespace) {
      return Promise.reject(new Error('No namespace provided'));
    }
    const rawData = await getAAModels(namespace);

    // Fetch MaaS models to identify which AI models are MaaS models
    let maasModelIds: Set<string> = new Set();
    try {
      const maasModels = await getMaaSModels(namespace);
      maasModelIds = new Set(maasModels.map((model) => model.id));
    } catch {
      // If MaaS models fetch fails, continue without marking any as MaaS
      // This is a non-critical failure - we'll just not mark any models as MaaS
    }

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

      // Check if this model is a MaaS model by comparing model_id or model_name with MaaS model IDs
      // Priority: check model_id first, then model_name
      let isMaaSModel = false;
      let maasModelId: string | undefined;

      if (maasModelIds.has(item.model_id)) {
        isMaaSModel = true;
        maasModelId = item.model_id;
      } else if (maasModelIds.has(item.model_name)) {
        isMaaSModel = true;
        maasModelId = item.model_name;
      }

      return {
        ...item,
        internalEndpoint,
        externalEndpoint,
        isMaaSModel,
        maasModelId,
      };
    });
  }, [namespace]);

  const [data, loaded, error, refresh] = useFetchState(fetchAIModels, [], {
    initialPromisePurity: true,
  });

  return { data, loaded, error, refresh };
};

export default useFetchAIModels;
