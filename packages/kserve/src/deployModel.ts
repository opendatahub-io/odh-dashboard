import type { HardwareProfileConfig } from '@odh-dashboard/hardware-profiles/shared';
import type { K8sAPIOptions, SupportedModelFormats } from '@odh-dashboard/k8s-core';
import {
  type InferenceServiceKind,
  ServingRuntimeModelType,
} from '@odh-dashboard/model-serving/shared';
import {
  DeploymentStrategyFieldData,
  type ModelLocationData,
  ModelLocationType,
} from '@odh-dashboard/model-serving/shared/types/form-data';
import type {
  ModelAvailabilityFieldsData,
  EnvironmentVariablesFieldData,
  ExternalRouteFieldData,
  NumReplicasFieldData,
  RuntimeArgsFieldData,
  TokenAuthenticationFieldData,
  CreateConnectionData,
} from '@odh-dashboard/model-serving/shared/wizard-fields';
import {
  applyHardwareProfileConfig,
  INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
} from '@odh-dashboard/hardware-profiles/shared';
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
  applyDeploymentStrategy,
} from './deployUtils';
import { applyReplicas } from './hardware';
import {
  createInferenceService,
  patchInferenceService,
  updateInferenceService,
} from './api/inferenceService';
import { applyModelRuntime } from './deployServer';

export type CreatingInferenceServiceObject = {
  project: string;
  name: string;
  k8sName: string;
  description: string;
  modelType?: string;
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
  deploymentStrategy?: DeploymentStrategyFieldData;
};

export const assembleInferenceService = (
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
    deploymentStrategy,
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
          predictor: {},
        },
      };

  inferenceService = applyDisplayNameDesc(inferenceService, name, description);
  inferenceService = applyDashboardResourceLabel(inferenceService);

  inferenceService = applyModelType(
    inferenceService,
    modelType ?? ServingRuntimeModelType.GENERATIVE,
  );

  inferenceService = applyModelFormat(inferenceService, modelFormat);
  inferenceService = applyModelRuntime(inferenceService, k8sName);

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

  inferenceService = applyHardwareProfileConfig(
    inferenceService,
    hardwareProfile,
    INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
  );

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

  inferenceService = applyDeploymentStrategy(inferenceService, deploymentStrategy);

  return inferenceService;
};

/**
 * Selects the appropriate method to deploy an inference service based on the existing inference service and the options.
 * Hides the complexity of the different methods from the caller.
 */
export const deployInferenceService = (
  inferenceService: InferenceServiceKind,
  existingInferenceService?: InferenceServiceKind,
  opts?: K8sAPIOptions & { overwrite?: boolean },
): Promise<InferenceServiceKind> => {
  if (!existingInferenceService) {
    return createInferenceService(inferenceService, opts);
  }
  if (opts?.overwrite) {
    return patchInferenceService(existingInferenceService, inferenceService, opts);
  }
  return updateInferenceService(inferenceService, opts);
};
