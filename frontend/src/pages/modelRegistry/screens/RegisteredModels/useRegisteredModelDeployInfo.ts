import React from 'react';
import useModelArtifactsByVersionId from '~/concepts/modelRegistry/apiHooks/useModelArtifactsByVersionId';
import useRegisteredModelById from '~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import { ModelVersion } from '~/concepts/modelRegistry/types';

export type RegisteredModelDeployInfo = {
  modelName: string;
  modelFormat?: string;
  modelArtifactUri?: string;
  modelArtifactStorageKey?: string;
};

const useRegisteredModelDeployInfo = (modelVersion: ModelVersion): RegisteredModelDeployInfo => {
  const [registeredModel] = useRegisteredModelById(modelVersion.registeredModelId);
  const [modelArtifactList] = useModelArtifactsByVersionId(modelVersion.id);

  const registeredModelDeployInfo = React.useMemo(() => {
    if (modelArtifactList.size === 0) {
      return {
        modelName: `${registeredModel?.name} - ${modelVersion.name}`,
      };
    }
    const modelArtifact = modelArtifactList.items[0];
    return {
      modelName: `${registeredModel?.name} - ${modelVersion.name} - ${new Date().toISOString()}`,
      modelFormat: modelArtifact.modelFormatName
        ? `${modelArtifact.modelFormatName} - ${modelArtifact.modelFormatVersion}`
        : undefined,
      modelArtifactUri: modelArtifact.uri,
      modelArtifactStorageKey: modelArtifact.storageKey,
    };
  }, [modelArtifactList.items, modelArtifactList.size, modelVersion.name, registeredModel?.name]);

  return registeredModelDeployInfo;
};

export default useRegisteredModelDeployInfo;
