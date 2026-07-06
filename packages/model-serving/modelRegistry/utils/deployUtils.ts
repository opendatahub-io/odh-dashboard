// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import type { ModelDeployPrefillInfo } from '@odh-dashboard/internal/pages/modelServing/screens/projects/usePrefillModelDeployModal';
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

/**
 * Builds serializable metadata from model registry info.
 *
 * Returns a plain object so it can safely pass through
 * history.pushState (navigation state must be structurally cloneable).
 */
export const getModelRegistryMetadata = (
  modelRegistryInfo: ModelDeployPrefillInfo['modelRegistryInfo'],
): K8sResourceCommon['metadata'] => {
  const { registeredModelId, modelVersionId, mrName } = modelRegistryInfo || {};
  return {
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
  };
};
