import React from 'react';
import useModelArtifactsByVersionId from '~/concepts/modelRegistry/apiHooks/useModelArtifactsByVersionId';
import useRegisteredModelById from '~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import { uriToStorageFields } from '~/concepts/modelRegistry/utils';

// TODO move this to ~/concepts/modelServing or ~/concepts/modelRegistry?
export type ModelDeployPrefillInfo = {
  modelName: string;
  modelFormat?: string;
  modelArtifactUri?: string;
  modelLocationType?: string;
  modelArtifactStorageKey?: string;
  modelRegistryInfo?: {
    modelVersionId?: string;
    registeredModelId?: string;
    mrName?: string;
  };
};

// TODO move this to ~/concepts/modelRegistry?

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

  const modelDeployPrefillInfo = React.useMemo(() => {
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
    const storageFields = uriToStorageFields(modelArtifact.uri || '');
    let modelLocationType;
    if (storageFields?.uri) {
      modelLocationType = 'uri-v1';
    }
    if (storageFields?.s3Fields) {
      modelLocationType = 's3';
    }
    if (storageFields?.ociUri) {
      modelLocationType = 'oci-v1';
    }
    return {
      modelDeployPrefillInfo: {
        modelName,
        modelFormat: modelArtifact.modelFormatName
          ? `${modelArtifact.modelFormatName} - ${modelArtifact.modelFormatVersion ?? ''}`
          : undefined,
        modelArtifactUri: modelArtifact.uri,
        modelLocationType,
        modelArtifactStorageKey: modelArtifact.storageKey,
        modelRegistryInfo: {
          modelVersionId: modelVersion.id,
          registeredModelId: modelVersion.registeredModelId,
          mrName,
        },
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

  return modelDeployPrefillInfo;
};

export default useRegisteredModelDeployPrefillInfo;
