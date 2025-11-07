import * as React from 'react';
import {
  FetchStateCallbackPromise,
  FetchStateObject,
  NotReadyError,
  useFetchState,
} from 'mod-arch-core';
import { LlamaModel } from '~/app/types';
import { splitLlamaModelId } from '~/app/utilities/utils';
import { useGenAiAPI } from './useGenAiAPI';

const useFetchLlamaModels = (lsdNotReady?: boolean): FetchStateObject<LlamaModel[]> => {
  const { api, apiAvailable } = useGenAiAPI();
  const fetchLlamaModels = React.useCallback<FetchStateCallbackPromise<LlamaModel[]>>(async () => {
    if (!apiAvailable) {
      return Promise.reject(new NotReadyError('API not yet available'));
    }
    if (lsdNotReady) {
      return Promise.reject(new Error('LSD is not ready'));
    }
    const models = await api.getLSDModels();
    return models.map((model) => ({
      ...model,
      modelId: splitLlamaModelId(model.id).id,
    }));
  }, [api, apiAvailable, lsdNotReady]);

  const [data, loaded, error, refresh] = useFetchState(fetchLlamaModels, [], {
    initialPromisePurity: true,
  });
  return { data, loaded, error, refresh };
};

export default useFetchLlamaModels;
