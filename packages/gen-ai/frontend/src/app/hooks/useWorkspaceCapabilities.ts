import * as React from 'react';
import { AIModel } from '~/app/types';
import { isASRModel, isVisionModel } from '~/app/utilities/utils';

export interface WorkspaceCapabilities {
  hasVisionModel: boolean;
  hasASRModel: boolean;
  capabilitiesReady: boolean;
  capabilitiesError: boolean;
}

const useWorkspaceCapabilities = (
  aiModels: AIModel[],
  aiModelsLoaded: boolean,
  maasModelsLoaded: boolean,
  aiModelsError: Error | undefined,
): WorkspaceCapabilities => {
  const capabilitiesReady = aiModelsLoaded && maasModelsLoaded;
  const capabilitiesError = !!aiModelsError;

  const { hasVisionModel, hasASRModel } = React.useMemo(() => {
    if (!aiModelsLoaded) {
      return { hasVisionModel: false, hasASRModel: false };
    }
    return {
      hasVisionModel: aiModels.some((m) => isVisionModel(m)),
      hasASRModel: aiModels.some((m) => isASRModel(m) && m.model_source_type === 'namespace'),
    };
  }, [aiModels, aiModelsLoaded]);

  return { hasVisionModel, hasASRModel, capabilitiesReady, capabilitiesError };
};

export default useWorkspaceCapabilities;
