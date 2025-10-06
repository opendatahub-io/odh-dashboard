import * as React from 'react';
import { FetchStateCallbackPromise, FetchStateObject, useFetchState } from 'mod-arch-core';
import { getModels } from '~/app/services/llamaStackService';
import { LlamaModel } from '~/app/types';
import { splitLlamaModelId } from '~/app/utilities/utils';

const useFetchLlamaModels = (
  selectedProject?: string,
  lsdNotReady?: boolean,
): FetchStateObject<LlamaModel[]> => {
  const fetchLlamaModels = React.useCallback<FetchStateCallbackPromise<LlamaModel[]>>(async () => {
    if (!selectedProject) {
      return Promise.reject(new Error('No project selected'));
    }
    if (lsdNotReady) {
      return Promise.reject(new Error('LSD is not ready'));
    }
    const models = await getModels(selectedProject);
    return models.map((model) => ({
      ...model,
      modelId: splitLlamaModelId(model.id).id,
    }));
  }, [selectedProject, lsdNotReady]);

  const [data, loaded, error, refresh] = useFetchState(fetchLlamaModels, [], {
    initialPromisePurity: true,
  });
  return { data, loaded, error, refresh };
};

export default useFetchLlamaModels;
