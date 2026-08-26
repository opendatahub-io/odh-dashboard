import { AIModel } from '~/app/types';
import useFetchAIModels from './useFetchAIModels';

type UseMergedModelsResult = {
  models: AIModel[];
  loaded: boolean;
  error: Error | undefined;
  refresh: () => void;
  isPartialResponse: boolean;
};

const useMergedModels = (): UseMergedModelsResult => {
  const { data: models = [], loaded, error, refresh, isPartialResponse } = useFetchAIModels();

  return {
    models,
    loaded: loaded || !!error,
    error,
    refresh,
    isPartialResponse,
  };
};

export default useMergedModels;
