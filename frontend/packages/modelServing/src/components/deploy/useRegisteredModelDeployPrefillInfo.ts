import React from 'react';
import {
  ModelArtifactList,
  ModelVersion,
  RegisteredModel,
} from '@odh-dashboard/internal/concepts/modelRegistry/types';
import { uriToConnectionTypeName } from '@odh-dashboard/internal/concepts/modelRegistry/utils';
import { ModelDeployPrefillInfo } from '@odh-dashboard/internal/pages/modelServing/screens/projects/usePrefillModelDeployModal';
import { FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';

const useRegisteredModelDeployPrefillInfo = (
  modelVersion: ModelVersion,
  registeredModelState: FetchStateObject<RegisteredModel | null>,
  modelArtifactListState: FetchStateObject<ModelArtifactList>,
  mrName?: string,
): {
  modelDeployPrefillInfo: ModelDeployPrefillInfo;
  loaded: boolean;
  error: Error | undefined;
} => {
  const {
    data: registeredModel,
    loaded: registeredModelLoaded,
    error: registeredModelError,
  } = registeredModelState;
  const {
    data: modelArtifactList,
    loaded: modelArtifactListLoaded,
    error: modelArtifactListError,
  } = modelArtifactListState;

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
