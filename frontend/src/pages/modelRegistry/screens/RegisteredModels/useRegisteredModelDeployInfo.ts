import React from 'react';
import useModelArtifactsByVersionId from '~/concepts/modelRegistry/apiHooks/useModelArtifactsByVersionId';
import useRegisteredModelById from '~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import { uriToStorageFields } from '~/concepts/modelRegistry/utils';

export type RegisteredModelDeployInfo = {
  modelName: string;
  modelFormat?: string;
  modelArtifactUri?: string;
  modelLocationType?: string;
  modelArtifactStorageKey?: string;
  modelVersionId?: string;
  registeredModelId?: string;
  mrName?: string;
};

const useRegisteredModelDeployInfo = (
  modelVersion: ModelVersion,
  mrName?: string,
): {
  registeredModelDeployInfo: RegisteredModelDeployInfo;
  loaded: boolean;
  error: Error | undefined;
} => {
  const [registeredModel, registeredModelLoaded, registeredModelError] = useRegisteredModelById(
    modelVersion.registeredModelId,
  );
  const [modelArtifactList, modelArtifactListLoaded, modelArtifactListError] =
    useModelArtifactsByVersionId(modelVersion.id);

  const registeredModelDeployInfo = React.useMemo(() => {
    const modelName = `${registeredModel?.name ?? ''} - ${modelVersion.name}`.slice(0, 63);

    if (modelArtifactList.size === 0) {
      return {
        registeredModelDeployInfo: {
          modelName,
        },
        loaded: registeredModelLoaded && modelArtifactListLoaded,
        error: registeredModelError || modelArtifactListError,
      };
    }
    const modelArtifact = modelArtifactList.items[0];
    const storageFields = uriToStorageFields(modelArtifact.uri || '');
    let modelLocationType;
    if (storageFields?.uri) {
      modelLocationType = 'uri-v1';
    }
    if (storageFields?.s3Fields) {
      modelLocationType = 's3';
    }
    return {
      registeredModelDeployInfo: {
        modelName,
        modelFormat: modelArtifact.modelFormatName
          ? `${modelArtifact.modelFormatName} - ${modelArtifact.modelFormatVersion ?? ''}`
          : undefined,
        modelArtifactUri: modelArtifact.uri,
        modelLocationType,
        modelArtifactStorageKey: modelArtifact.storageKey,
        modelVersionId: modelVersion.id,
        registeredModelId: modelVersion.registeredModelId,
        mrName,
      },
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

  return registeredModelDeployInfo;
};

export default useRegisteredModelDeployInfo;
