import { AIModel } from '~/app/types';
import useFetchAIModels from './useFetchAIModels';

type UseMergedModelsResult = {
  models: AIModel[];
  loaded: boolean;
  error: Error | undefined;
  refresh: () => void;
};

const useMergedModels = (): UseMergedModelsResult => {
  const { data: models = [], loaded, error, refresh } = useFetchAIModels();

  return {
    models,
    loaded: loaded || !!error,
    error,
    refresh,
  };
};

export default useMergedModels;
