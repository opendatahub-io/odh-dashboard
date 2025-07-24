import React from 'react';
import { ModelVersion, RegisteredModel } from '~/app/types';
import { useModelArtifactsByVersionId, useRegisteredModelById } from '~/odh/api';
import { uriToConnectionTypeName } from '~/odh/utils';

export type ModelDeployPrefillInfo = {
  modelName: string;
  modelFormat?: string;
  modelArtifactUri?: string;
  connectionTypeName?: string;
  initialConnectionName?: string;
  modelRegistryInfo?: {
    modelVersionId?: string;
    registeredModelId?: string;
    mrName?: string;
  };
};

const useRegisteredModelDeployPrefillInfo = (
  modelVersion: ModelVersion,
  mrName?: string,
): {
  modelDeployPrefillInfo: ModelDeployPrefillInfo;
  registeredModel: RegisteredModel | null;
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
        registeredModel: null,
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
      registeredModel,
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
