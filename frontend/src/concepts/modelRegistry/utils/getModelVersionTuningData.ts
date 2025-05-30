import { ModelVersion, RegisteredModel, ModelArtifactList } from '#~/concepts/modelRegistry/types';
import { ServiceKind } from '#~/k8sTypes';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { getServerAddress } from '#~/pages/modelRegistry/screens/utils';

export const getModelVersionTuningData = (
  modelVersion: ModelVersion | null,
  registeredModel: RegisteredModel | null,
  modelArtifacts: ModelArtifactList | null,
  modelRegistryServices: ServiceKind[],
  preferredModelRegistry: ServiceKind | null,
): {
  modelRegistryName: string;
  modelRegistryDisplayName: string;
  registeredModelId: string;
  registeredModelName: string;
  modelVersionId: string;
  modelVersionName: string;
  inputModelLocationUri: string;
  outputModelRegistryApiUrl: string;
} | null => {
  const registryService = modelRegistryServices.find(
    (s) => s.metadata.name === preferredModelRegistry?.metadata.name,
  );

  const inputModelLocationUri = modelArtifacts?.items[0]?.uri;
  const modelRegistryDisplayName = registryService
    ? getDisplayNameFromK8sResource(registryService)
    : '';
  const outputModelRegistryApiUrl = registryService
    ? `https://${getServerAddress(registryService)}`
    : '';

  if (modelVersion && registeredModel && inputModelLocationUri && registryService) {
    return {
      modelRegistryName: registryService.metadata.name,
      modelRegistryDisplayName,
      registeredModelId: modelVersion.registeredModelId,
      registeredModelName: registeredModel.name,
      modelVersionId: modelVersion.id,
      modelVersionName: modelVersion.name,
      inputModelLocationUri,
      outputModelRegistryApiUrl,
    };
  }

  return null;
};
