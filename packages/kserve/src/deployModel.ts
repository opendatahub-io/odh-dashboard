import type { HardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import {
  type SupportedModelFormats,
  type InferenceServiceKind,
} from '@odh-dashboard/internal/k8sTypes';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';

import {
  type ModelLocationData,
  ModelLocationType,
} from '@odh-dashboard/model-serving/types/form-data';
import type { ModelAvailabilityFieldsData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ModelAvailabilityFields';
import type { EnvironmentVariablesFieldData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/EnvironmentVariablesField';
import type { ExternalRouteFieldData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ExternalRouteField';
import type { NumReplicasFieldData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/NumReplicasField';
import type { RuntimeArgsFieldData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/RuntimeArgsField';
import type { TokenAuthenticationFieldData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/TokenAuthenticationField';
import type { CreateConnectionData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/CreateConnectionInputFields';
import {
  applyAiAvailableAssetAnnotations,
  applyAuth,
  applyEnvironmentVariables,
  applyModelFormat,
  applyConnectionData,
  applyRuntimeArgs,
  applyDashboardResourceLabel,
  applyDisplayNameDesc,
  applyModelType,
} from './deployUtils';
import { applyHardwareProfileToDeployment, applyReplicas } from './hardware';
import {
  createInferenceService,
  patchInferenceService,
  updateInferenceService,
} from './api/inferenceService';

export type CreatingInferenceServiceObject = {
  project: string;
  name: string;
  k8sName: string;
  description: string;
  modelType?: ServingRuntimeModelType;
  modelLocationData?: ModelLocationData;
  hardwareProfile: HardwareProfileConfig;
  modelFormat?: SupportedModelFormats;
  externalRoute?: ExternalRouteFieldData;
  tokenAuth?: TokenAuthenticationFieldData;
  numReplicas?: NumReplicasFieldData;
  runtimeArgs?: RuntimeArgsFieldData;
  environmentVariables?: EnvironmentVariablesFieldData;
  modelAvailability?: ModelAvailabilityFieldsData;
  createConnectionData?: CreateConnectionData;
};

const assembleInferenceService = (
  data: CreatingInferenceServiceObject,
  existingInferenceService?: InferenceServiceKind,
  dryRun?: boolean,
  secretName?: string,
): InferenceServiceKind => {
  const {
    project,
    k8sName,
    name,
    description,
    modelType,
    modelLocationData,
    createConnectionData,
    modelFormat,
    hardwareProfile,
    numReplicas,
    modelAvailability,
    externalRoute,
    tokenAuth,
    runtimeArgs,
    environmentVariables,
  } = data;
  let inferenceService: InferenceServiceKind = existingInferenceService
    ? { ...existingInferenceService }
    : {
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name: k8sName,
          namespace: project,
        },
        spec: {
          predictor: {
            model: {
              runtime: k8sName,
            },
          },
        },
      };

  inferenceService = applyDisplayNameDesc(inferenceService, name, description);
  inferenceService = applyDashboardResourceLabel(inferenceService);
  inferenceService = applyModelType(
    inferenceService,
    modelType ?? ServingRuntimeModelType.GENERATIVE,
  );

  inferenceService = applyModelFormat(inferenceService, modelFormat);

  inferenceService = applyConnectionData(
    inferenceService,
    createConnectionData ?? {},
    modelLocationData ?? {
      type: ModelLocationType.NEW,
      fieldValues: { URI: '' },
      additionalFields: { modelUri: '' },
    },
    dryRun,
    secretName,
  );

  inferenceService = applyHardwareProfileToDeployment(inferenceService, hardwareProfile);

  inferenceService = applyAuth(
    inferenceService,
    (tokenAuth && tokenAuth.length > 0) ?? false,
    externalRoute ?? false,
  );

  inferenceService = applyAiAvailableAssetAnnotations(
    inferenceService,
    modelAvailability ?? {
      saveAsAiAsset: false,
      useCase: '',
    },
  );

  inferenceService = applyReplicas(inferenceService, numReplicas ?? 1);

  inferenceService = applyRuntimeArgs(
    inferenceService,
    runtimeArgs ?? { args: [], enabled: false },
  );

  inferenceService = applyEnvironmentVariables(
    inferenceService,
    environmentVariables ?? { variables: [], enabled: false },
  );

  return inferenceService;
};

/**
 * Selects the appropriate method to deploy an inference service based on the existing inference service and the options.
 * Hides the complexity of the different methods from the caller.
 */
export const deployInferenceService = (
  data: CreatingInferenceServiceObject,
  existingInferenceService?: InferenceServiceKind,
  connectionSecretName?: string,
  opts?: {
    dryRun?: boolean;
    overwrite?: boolean;
  },
): Promise<InferenceServiceKind> => {
  const newInferenceService = assembleInferenceService(
    data,
    existingInferenceService,
    opts?.dryRun,
    connectionSecretName,
  );

  if (!existingInferenceService) {
    return createInferenceService(newInferenceService, opts);
  }
  if (opts?.overwrite) {
    return patchInferenceService(existingInferenceService, newInferenceService, opts);
  }
  return updateInferenceService(newInferenceService, opts);
};
