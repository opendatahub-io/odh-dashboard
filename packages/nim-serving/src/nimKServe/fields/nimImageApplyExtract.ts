import { KServeDeployment } from '@odh-dashboard/kserve/types';
import type { NIMImageFieldValue } from '../../pages/deploymentWizard/fields/NIMImageField';
import { getModelNameFromRepository } from '../../api/images/utils';
import { KSERVE_CONTAINER_NAME } from '../../constants';

const setNIMDeploymentModelFormat = (
  deployment: KServeDeployment,
  nimImage: NIMImageFieldValue,
): KServeDeployment => ({
  ...deployment,
  model: {
    ...deployment.model,
    spec: {
      ...deployment.model.spec,
      predictor: {
        ...deployment.model.spec.predictor,
        model: {
          ...deployment.model.spec.predictor.model,
          modelFormat: { name: getModelNameFromRepository(nimImage.repository) },
        },
      },
    },
  },
  server: deployment.server
    ? {
        ...deployment.server,
        spec: {
          ...deployment.server.spec,
          supportedModelFormats: [
            {
              autoSelect: false,
              name: getModelNameFromRepository(nimImage.repository),
              priority: 1,
              version: nimImage.tag,
            },
          ],
        },
      }
    : undefined,
});

const setNIMDeploymentImage = (
  deployment: KServeDeployment,
  nimImage: NIMImageFieldValue,
): KServeDeployment => {
  if (!deployment.server) {
    return deployment;
  }
  const newServingRuntime = structuredClone(deployment.server);
  newServingRuntime.spec.containers = newServingRuntime.spec.containers.map((c) => {
    if (c.name === KSERVE_CONTAINER_NAME) {
      return {
        ...c,
        image: `${nimImage.repository}:${nimImage.tag}`,
      };
    }
    return c;
  });
  return {
    ...deployment,
    server: newServingRuntime,
  };
};

/**
 * Writes the selected NIM image onto the ServingRuntime, and mirrors the model name onto the
 * InferenceService's model format so it matches the runtime's `supportedModelFormats` entry.
 * Without the format override the InferenceService keeps KServe's generic default and KServe
 * refuses to bind it to the NIM runtime.
 */
export const applyNIMImageFieldData = (
  deployment: KServeDeployment,
  fieldData: NIMImageFieldValue,
): KServeDeployment => {
  if (!fieldData.repository || !fieldData.tag) {
    return deployment;
  }

  // Legacy NIM sets `modelFormat` to match between the InferenceService and ServingRuntime to stop errors complaining about mismatches
  let assembledDeployment = setNIMDeploymentModelFormat(deployment, fieldData);

  // Legacy NIM works by setting the runtime image name to the selected NIM image
  assembledDeployment = setNIMDeploymentImage(assembledDeployment, fieldData);

  return assembledDeployment;
};
