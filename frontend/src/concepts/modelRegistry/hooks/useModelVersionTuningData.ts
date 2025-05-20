import * as React from 'react';
import type { ModelVersion, RegisteredModel } from '~/concepts/modelRegistry/types';
import useModelArtifactsByVersionId from '~/concepts/modelRegistry/apiHooks/useModelArtifactsByVersionId';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { getServerAddress } from '~/pages/modelRegistry/screens/utils';
import { ModelRegistriesContext } from '~/concepts/modelRegistry/context/ModelRegistriesContext';

export const useModelVersionTuningData = (
  modelVersionId: string | null,
  modelVersion: ModelVersion | null,
  registeredModel: RegisteredModel | null,
): {
  tuningData: {
    modelRegistryName: string;
    modelRegistryDisplayName: string;
    registeredModelId: string;
    registeredModelName: string;
    modelVersionId: string;
    modelVersionName: string;
    inputModelLocationUri: string;
    outputModelRegistryApiUrl: string;
  } | null;
  loaded: boolean;
  loadError: Error | null;
} => {
  const { preferredModelRegistry, modelRegistryServices } =
    React.useContext(ModelRegistriesContext);
  const registryService = modelRegistryServices.find(
    (s) => s.metadata.name === preferredModelRegistry?.metadata.name,
  );

  const [artifacts, loaded, loadError] = useModelArtifactsByVersionId(modelVersionId || undefined);

  const inputModelLocationUri = artifacts.items[0]?.uri;
  const modelRegistryDisplayName = registryService
    ? getDisplayNameFromK8sResource(registryService)
    : '';
  const outputModelRegistryApiUrl = registryService
    ? `https://${getServerAddress(registryService)}`
    : '';

  return {
    tuningData:
      modelVersionId && modelVersion && inputModelLocationUri && registryService && registeredModel
        ? {
            modelRegistryName: registryService.metadata.name,
            modelRegistryDisplayName,
            registeredModelId: modelVersion.registeredModelId,
            registeredModelName: registeredModel.name,
            modelVersionId: modelVersion.id,
            modelVersionName: modelVersion.name,
            inputModelLocationUri,
            outputModelRegistryApiUrl,
          }
        : null,
    loaded,
    loadError: loadError || null,
  };
};
