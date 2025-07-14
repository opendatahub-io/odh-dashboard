import React from 'react';
import useModelArtifactsByVersionId from '#~/concepts/modelRegistry/apiHooks/useModelArtifactsByVersionId';
import useRegisteredModelById from '#~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import { ModelVersion } from '#~/concepts/modelRegistry/types';
import { uriToConnectionTypeName } from '#~/concepts/modelRegistry/utils';
import { ModelDeployPrefillInfo } from '#~/pages/modelServing/screens/projects/usePrefillModelDeployModal';

const useRegisteredModelDeployPrefillInfo = (
  modelVersion: ModelVersion,
  mrName?: string,
): {
  modelDeployPrefillInfo: ModelDeployPrefillInfo;
  loaded: boolean;
  error: Error | undefined;
} => {
  const [registeredModel, registeredModelLoaded, registeredModelError] = useRegisteredModelById(
    modelVersion.registeredModelId,
  );
  const [modelArtifactList, modelArtifactListLoaded, modelArtifactListError] =
    useModelArtifactsByVersionId(modelVersion.id);

  return React.useMemo(() => {
    const modelName = `${registeredModel?.name ?? ''} - ${modelVersion.name}`.slice(0, 63);

    if (modelArtifactList.size === 0) {
      return {
        modelDeployPrefillInfo: {
          modelName,
        },
        loaded: registeredModelLoaded && modelArtifactListLoaded,
        error: registeredModelError || modelArtifactListError,
      };
    }
    const modelArtifact = modelArtifactList.items[0];
    const connectionTypeName = uriToConnectionTypeName(modelArtifact.uri);
    return {
      modelDeployPrefillInfo: {
        modelName,
        modelFormat: modelArtifact.modelFormatName
          ? `${modelArtifact.modelFormatName} - ${modelArtifact.modelFormatVersion ?? ''}`
          : undefined,
        modelArtifactUri: modelArtifact.uri,
        connectionTypeName,
        initialConnectionName: modelArtifact.storageKey,
        modelRegistryInfo: {
          modelVersionId: modelVersion.id,
          registeredModelId: modelVersion.registeredModelId,
          mrName,
        },
      } satisfies ModelDeployPrefillInfo,
      loaded: registeredModelLoaded && modelArtifactListLoaded,
      error: registeredModelError || modelArtifactListError,
    };
  }, [
    modelArtifactList.items,
    modelArtifactList.size,
    modelArtifactListError,
    modelArtifactListLoaded,
    modelVersion.id,
    modelVersion.name,
    modelVersion.registeredModelId,
    registeredModel?.name,
    registeredModelError,
    registeredModelLoaded,
    mrName,
  ]);
};

export default useRegisteredModelDeployPrefillInfo;
