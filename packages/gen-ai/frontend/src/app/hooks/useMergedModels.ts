import * as React from 'react';
import { AIModel } from '~/app/types';
import { convertMaaSModelToAIModel } from '~/app/utilities/utils';
import useFetchAIModels from './useFetchAIModels';
import useFetchMaaSModels from './useFetchMaaSModels';

type UseMergedModelsResult = {
  models: AIModel[];
  loaded: boolean;
  aiError: Error | undefined;
  maasError: Error | undefined;
};

const useMergedModels = (): UseMergedModelsResult => {
  const { data: aiModels = [], loaded: aiLoaded, error: aiError } = useFetchAIModels();
  const { data: maasModels = [], loaded: maasLoaded, error: maasError } = useFetchMaaSModels();

  const aiReady = aiLoaded || !!aiError;
  const maasReady = maasLoaded || !!maasError;

  const models = React.useMemo(
    () => [...aiModels, ...maasModels.map(convertMaaSModelToAIModel)],
    [aiModels, maasModels],
  );

  return {
    models,
    loaded: aiReady && maasReady,
    aiError,
    maasError,
  };
};

export default useMergedModels;
