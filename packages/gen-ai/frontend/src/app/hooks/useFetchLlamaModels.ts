import * as React from 'react';
import {
  FetchStateCallbackPromise,
  FetchStateObject,
  NotReadyError,
  useFetchState,
} from 'mod-arch-core';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { LlamaModel } from '~/app/types';
import { splitLlamaModelId } from '~/app/utilities/utils';
import { GRID } from '~/odh/extensions';
import { useGenAiAPI } from './useGenAiAPI';
import useChatPlaygroundEnabled from './useChatPlaygroundEnabled';

const useFetchLlamaModels = (
  lsdNotReady?: boolean,
  includeEmbeddingModels?: boolean,
): FetchStateObject<LlamaModel[]> => {
  const { api, apiAvailable } = useGenAiAPI();
  const isChatPlaygroundEnabled = useChatPlaygroundEnabled();
  const [maasConsumerPortalEnabled] = useFeatureFlag(GRID);
  const fetchLlamaModels = React.useCallback<FetchStateCallbackPromise<LlamaModel[]>>(async () => {
    if (!apiAvailable) {
      return Promise.reject(new NotReadyError('API not yet available'));
    }
    if (lsdNotReady && !maasConsumerPortalEnabled) {
      return Promise.reject(new Error('LSD is not ready'));
    }
    if (!isChatPlaygroundEnabled) {
      return Promise.reject(new NotReadyError('Playground is not enabled'));
    }
    if (maasConsumerPortalEnabled) {
      return [];
    }
    // eslint-disable-next-line camelcase
    const queryParams = includeEmbeddingModels ? { include_embedding_models: true } : {};
    const models = await api.getLSDModels(queryParams);
    const safeModels = Array.isArray(models) ? models : [];
    return safeModels.map((model) => ({
      ...model,
      modelId: splitLlamaModelId(model.id).id,
    }));
  }, [
    api,
    apiAvailable,
    lsdNotReady,
    includeEmbeddingModels,
    isChatPlaygroundEnabled,
    maasConsumerPortalEnabled,
  ]);

  const [data, loaded, error, refresh] = useFetchState(fetchLlamaModels, [], {
    initialPromisePurity: true,
  });
  return { data, loaded, error, refresh };
};

export default useFetchLlamaModels;
