import type { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import {
  getExistingHardwareProfileData,
  getExistingResources,
} from '@odh-dashboard/internal/concepts/hardwareProfiles/utils';
import { MODEL_SERVING_VISIBILITY } from '@odh-dashboard/internal/concepts/hardwareProfiles/const';
import type { ModelLocationData } from '@odh-dashboard/model-serving/components/deploymentWizard/types';
import { ModelLocationType } from '@odh-dashboard/model-serving/components/deploymentWizard/types';
import type { ModelTypeFieldData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ModelTypeSelectField';
import type { ExtractionResult } from '@odh-dashboard/model-serving/extension-points';
import type { NIMDeployment } from '../../api/nimservices/types';
import { NIM_SERVICE_HARDWARE_PROFILE_PATHS } from '../../api/nimservices/utils';
import { NIM_MODEL_TYPE } from '../../../extensions';

export { NIM_SERVICE_HARDWARE_PROFILE_PATHS };

export const extractNIMHardwareProfileConfig = (
  deployment: NIMDeployment,
): ExtractionResult<Parameters<typeof useHardwareProfileConfig> | null> => {
  const { name, namespace: hardwareProfileNamespace } = getExistingHardwareProfileData(
    deployment.model,
  );
  const { existingContainerResources, existingTolerations, existingNodeSelector } =
    getExistingResources(deployment.model, NIM_SERVICE_HARDWARE_PROFILE_PATHS);

  return {
    data: [
      name,
      existingContainerResources,
      existingTolerations,
      existingNodeSelector,
      MODEL_SERVING_VISIBILITY,
      deployment.model.metadata.namespace,
      hardwareProfileNamespace,
    ],
  };
};

export const extractNIMReplicas = (deployment: NIMDeployment): ExtractionResult<number | null> => ({
  data: deployment.model.spec.replicas ?? null,
});

export const extractNIMEnvironmentVariables = (
  deployment: NIMDeployment,
): { enabled: boolean; variables: { name: string; value: string }[] } | null => {
  const envVars = deployment.model.spec.env;
  if (!envVars || envVars.length === 0) {
    return null;
  }
  return {
    enabled: true,
    variables: envVars.map((envVar) => ({
      name: envVar.name,
      value: envVar.value ?? '',
    })),
  };
};

export const extractNIMModelLocationData = (): ModelLocationData | null => ({
  type: ModelLocationType.NIM,
  fieldValues: {},
  additionalFields: {},
});

export const extractNIMRuntimeArgs = (
  deployment: NIMDeployment,
): { enabled: boolean; args: string[] } | null => {
  const { args } = deployment.model.spec;
  if (!args || args.length === 0) {
    return null;
  }
  return { enabled: true, args };
};

export const extractNIMModelAvailabilityData = (): {
  saveAsAiAsset: boolean;
  useCase?: string;
} | null => null;

export const extractNIMModelType = (): ModelTypeFieldData => ({
  type: NIM_MODEL_TYPE,
});

export const extractNIMModelServerTemplate = (): null => null;

const AUTH_ANNOTATION = 'security.opendatahub.io/enable-auth';

export const isNIMAuthEnabled = (deployment?: NIMDeployment): boolean => {
  if (!deployment) {
    return false;
  }
  const annotation = deployment.model.spec.annotations?.[AUTH_ANNOTATION];
  if (annotation !== undefined) {
    return annotation !== 'false';
  }
  return false;
};
