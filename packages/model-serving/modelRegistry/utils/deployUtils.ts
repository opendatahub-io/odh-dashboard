import { ModelDeployPrefillInfo } from '@odh-dashboard/internal/pages/modelServing/screens/projects/usePrefillModelDeployModal';

export const getModelRegistryTransform = (
  modelRegistryInfo: ModelDeployPrefillInfo['modelRegistryInfo'],
): { metadata?: { labels?: Record<string, string> } } => {
  const { registeredModelId, modelVersionId, mrName } = modelRegistryInfo || {};

  return {
    metadata: {
      labels: {
        ...(registeredModelId && {
          'modelregistry.opendatahub.io/registered-model-id': registeredModelId,
        }),
        ...(modelVersionId && {
          'modelregistry.opendatahub.io/model-version-id': modelVersionId,
        }),
        ...(mrName && {
          'modelregistry.opendatahub.io/name': mrName,
        }),
      },
    },
  };
};
