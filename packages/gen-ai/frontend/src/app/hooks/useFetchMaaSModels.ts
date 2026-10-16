import * as React from 'react';
import { FetchStateCallbackPromise, FetchStateObject, useFetchState } from 'mod-arch-core';
import { getAAModels } from '~/app/services/llamaStackService';
import { AIModel } from '~/app/types';
import { API_URL_PREFIX } from '~/app/utilities/const';
import { convertMaaSModelToAIModel } from '~/app/utilities/utils';
import { isValidAAModel } from './useFetchAIModels';

// Subscription models do not need GenAiContext or its namespace discovery.
const getMaaSModels = getAAModels(`${API_URL_PREFIX}/api/v1`);

const useFetchMaaSModels = (): FetchStateObject<AIModel[]> => {
  const fetchModels = React.useCallback<FetchStateCallbackPromise<AIModel[]>>(async (opts) => {
    const models = await getMaaSModels({ sources: 'maas' }, opts);
    if (!Array.isArray(models)) {
      throw new Error('Invalid response from getAAModels: expected an array');
    }
    return models
      .filter(isValidAAModel)
      .filter((model) => model.model_source_type === 'maas')
      .map(convertMaaSModelToAIModel);
  }, []);

  const [data, loaded, error, refresh] = useFetchState(fetchModels, [], {
    initialPromisePurity: true,
  });

  return { data, loaded, error, refresh };
};

export default useFetchMaaSModels;
