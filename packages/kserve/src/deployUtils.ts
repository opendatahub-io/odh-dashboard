import {
  KnownLabels,
  MetadataAnnotation,
  SupportedModelFormats,
  isModelServingCompatible,
  ModelServingCompatibleTypes,
} from '@odh-dashboard/k8s-core';
import {
  type InferenceServiceKind,
  ServingRuntimeModelType,
} from '@odh-dashboard/model-serving/shared';
import { ModelLocationData } from '@odh-dashboard/model-serving/shared/types/form-data';
import {
  type ModelTypeFieldData,
  type ModelAvailabilityFieldsData,
  type RuntimeArgsFieldData,
  type EnvironmentVariablesFieldData,
  type CreateConnectionData,
  type DeploymentStrategyFieldData,
  type DeploymentMethodFieldData,
  deploymentStrategyRolling,
  deploymentStrategyRecreate,
  filterRuntimeArgsForContainer,
} from '@odh-dashboard/model-serving/shared/wizard-fields';
import { LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY } from './wizardFields/deploymentMethodField';
import type { KServeDeployment } from './types';

export const KSERVE_AUTH_ANNOTATION = 'security.opendatahub.io/enable-auth';
export const KSERVE_VISIBILITY_LABEL = 'networking.kserve.io/visibility';
export const KSERVE_DEPLOYMENT_MODE_ANNOTATION = 'serving.kserve.io/deploymentMode';

export enum KServeVisibility {
  Exposed = 'exposed',
  ClusterLocal = 'cluster-local',
}

export enum KServeDeploymentMode {
  RawDeployment = 'RawDeployment',
  Standard = 'Standard',
}

export const applyAuth = (
  inferenceService: InferenceServiceKind,
  tokenAuth: boolean,
  externalRoute: boolean,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.metadata.annotations = {
    ...result.metadata.annotations,
    [KSERVE_AUTH_ANNOTATION]: tokenAuth ? 'true' : 'false',
  };

  result.metadata.labels = {
    ...result.metadata.labels,
    ...(externalRoute && { [KSERVE_VISIBILITY_LABEL]: KServeVisibility.Exposed }),
  };

  if (!externalRoute) {
    delete result.metadata.labels[KSERVE_VISIBILITY_LABEL];
  }

  return result;
};

export const applyAiAvailableAssetAnnotations = (
  inferenceService: InferenceServiceKind,
  aiAvailableAsset: ModelAvailabilityFieldsData,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.metadata.labels = {
    ...result.metadata.labels,
    'opendatahub.io/genai-asset': aiAvailableAsset.saveAsAiAsset ? 'true' : 'false',
  };
  if (!aiAvailableAsset.saveAsAiAsset) {
    delete result.metadata.labels['opendatahub.io/genai-asset'];
  }

  result.metadata.annotations = {
    ...result.metadata.annotations,
    ...(aiAvailableAsset.saveAsAiAsset &&
      aiAvailableAsset.useCase && {
        'opendatahub.io/genai-use-case': aiAvailableAsset.useCase,
      }),
  };
  if (!aiAvailableAsset.saveAsAiAsset || !aiAvailableAsset.useCase) {
    delete result.metadata.annotations['opendatahub.io/genai-use-case'];
  }
  return result;
};

export const applyRuntimeArgs = (
  inferenceService: InferenceServiceKind,
  runtimeArgs: RuntimeArgsFieldData,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  const containerArgs = filterRuntimeArgsForContainer(runtimeArgs.args);
  result.spec.predictor.model = {
    ...result.spec.predictor.model,
    ...(runtimeArgs.enabled && containerArgs.length > 0 && { args: containerArgs }),
  };

  if (!runtimeArgs.enabled || containerArgs.length === 0) {
    delete result.spec.predictor.model.args;
  }

  return result;
};

export const applyEnvironmentVariables = (
  inferenceService: InferenceServiceKind,
  environmentVariables: EnvironmentVariablesFieldData,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.spec.predictor.model = {
    ...result.spec.predictor.model,
    ...(environmentVariables.enabled && {
      env: environmentVariables.variables.map((envVar) => ({
        name: envVar.name,
        value: envVar.value,
      })),
    }),
  };

  if (!environmentVariables.enabled) {
    delete result.spec.predictor.model.env;
  }

  return result;
};

export const applyModelFormat = (
  inferenceService: InferenceServiceKind,
  modelFormat?: SupportedModelFormats,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.spec.predictor.model = {
    ...result.spec.predictor.model,
    modelFormat: {
      name: modelFormat?.name ?? 'vLLM',
      version: modelFormat?.version,
    },
  };
  return result;
};

export const applyConnectionData = (
  inferenceService: InferenceServiceKind,
  createConnectionData: CreateConnectionData,
  modelLocationData: ModelLocationData,
  dryRun?: boolean,
  secretName?: string,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  if (secretName || createConnectionData.nameDesc?.name) {
    result.metadata.annotations = {
      ...result.metadata.annotations,
    };
    // Apply connection name to the annotations
    if (!dryRun) {
      result.metadata.annotations[MetadataAnnotation.ConnectionName] =
        secretName ?? createConnectionData.nameDesc?.name ?? '';
    }
    // Apply connection path to the annotations if the connection type is S3ObjectStorage
    if (
      modelLocationData.additionalFields.modelPath &&
      isModelServingCompatible(
        modelLocationData.connectionTypeObject ?? [],
        ModelServingCompatibleTypes.S3ObjectStorage,
      )
    ) {
      result.metadata.annotations = {
        ...result.metadata.annotations,
        'opendatahub.io/connection-path': modelLocationData.additionalFields.modelPath,
      };
    } else {
      // Delete connection path from the annotations if it's not present or the connection type is not S3ObjectStorage
      delete result.metadata.annotations['opendatahub.io/connection-path'];
    }
  }
  if (
    modelLocationData.additionalFields.modelUri &&
    isModelServingCompatible(
      modelLocationData.connectionTypeObject ?? [],
      ModelServingCompatibleTypes.OCI,
    )
  ) {
    result.spec.predictor.model = {
      ...result.spec.predictor.model,
      storageUri: modelLocationData.additionalFields.modelUri,
    };
  }
  return result;
};

export const applyDisplayNameDesc = (
  inferenceService: InferenceServiceKind,
  name: string,
  description: string,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.metadata.annotations = {
    ...result.metadata.annotations,
    'openshift.io/display-name': name,
    'openshift.io/description': description,
  };

  return result;
};

export const applyDashboardResourceLabel = (
  inferenceService: InferenceServiceKind,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.metadata.labels = {
    ...result.metadata.labels,
    [KnownLabels.DASHBOARD_RESOURCE]: 'true',
  };
  return result;
};

export const extractModelType = (deployment: {
  model: InferenceServiceKind;
}): ModelTypeFieldData | null => {
  const modelType = deployment.model.metadata.annotations?.['opendatahub.io/model-type'];
  if (!modelType) {
    return null;
  }

  return {
    type: modelType,
  };
};

const isKnownServingRuntimeModelType = (type?: string): type is ServingRuntimeModelType => {
  return type === ServingRuntimeModelType.PREDICTIVE || type === ServingRuntimeModelType.GENERATIVE;
};

export const applyModelType = (
  inferenceService: InferenceServiceKind,
  modelType: string,
): InferenceServiceKind => {
  if (!isKnownServingRuntimeModelType(modelType)) {
    console.error(
      `Invalid model type for kserve deployment: ${modelType}. Skipping applyModelType.`,
    );
    return inferenceService;
  }

  const result = structuredClone(inferenceService);
  result.metadata.annotations = {
    ...result.metadata.annotations,
    'opendatahub.io/model-type': modelType,
  };
  return result;
};

export const extractDeploymentStrategy = (
  kserveDeployment: KServeDeployment,
): DeploymentStrategyFieldData | null => {
  const { deploymentStrategy } = kserveDeployment.model.spec.predictor;
  if (!deploymentStrategy || typeof deploymentStrategy !== 'object') {
    return null;
  }

  const { type: strategyType } = deploymentStrategy;
  if (strategyType === 'RollingUpdate') {
    return deploymentStrategyRolling;
  }
  return deploymentStrategyRecreate;
};

export const applyDeploymentStrategy = (
  inferenceService: InferenceServiceKind,
  deploymentStrategy?: DeploymentStrategyFieldData,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  if (deploymentStrategy) {
    result.spec.predictor.deploymentStrategy = {
      type: deploymentStrategy === deploymentStrategyRolling ? 'RollingUpdate' : 'Recreate',
    };
  }
  return result;
};

export const extractDeploymentMethod = (): DeploymentMethodFieldData => ({
  method: LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY,
});
