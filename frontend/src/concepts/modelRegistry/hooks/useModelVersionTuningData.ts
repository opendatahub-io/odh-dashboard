import useModelArtifactsByVersionId from '~/concepts/modelRegistry/apiHooks/useModelArtifactsByVersionId';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { getServerAddress } from '~/pages/modelRegistry/screens/utils';
import { useModelRegistryServices } from '~/concepts/modelRegistry/apiHooks/useModelRegistryServices';
import { ModelRegistrySelectorContext } from '../context/ModelRegistrySelectorContext';
import { useContext } from 'react';
import type { ModelVersion } from '~/concepts/modelRegistry/types';

export const useModelVersionTuningData = (
  modelVersionId: string | null,
  modelVersion: ModelVersion | null,
) => {
  const { preferredModelRegistry, modelRegistryServices } = useContext(ModelRegistrySelectorContext);
  const registryService = modelRegistryServices.find(
    (s) => s.metadata.name === preferredModelRegistry?.metadata?.name
  );

  const [artifacts, loaded, loadError] = useModelArtifactsByVersionId(modelVersionId || undefined);

  const inputModelLocationUri = artifacts?.items?.[0]?.uri;
  const modelRegistryDisplayName = registryService 
    ? getDisplayNameFromK8sResource(registryService)
    : '';
  const outputModelRegistryApiUrl = registryService 
    ? getServerAddress(registryService)
    : '';

  return {
    tuningData: modelVersionId && modelVersion && inputModelLocationUri
      ? {
          modelRegistryName: registryService?.metadata.name || '',
          modelRegistryDisplayName,
          registeredModelId: modelVersion.registeredModelId,
          registeredModelName: modelVersion.name,
          modelVersionId: modelVersion.id,
          modelVersionName: modelVersion.name,
          inputModelLocationUri,
          outputModelRegistryApiUrl,
        }
      : null,
    loaded,
    loadError,
  };
}; 