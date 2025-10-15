import {
  KnownLabels,
  MetadataAnnotation,
  type SupportedModelFormats,
} from '@odh-dashboard/internal/k8sTypes';
import {
  isModelServingCompatible,
  ModelServingCompatibleTypes,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { ModelLocationData, ModelLocationType } from '@odh-dashboard/model-serving/types/form-data';
import {
  getPVCNameFromURI,
  isPVCUri,
} from '@odh-dashboard/internal/pages/modelServing/screens/projects/utils';
import type { LLMdContainer, LLMInferenceServiceKind, LLMdDeployment } from '../types';
import { AvailableAiAssetsFieldsData } from '../../../model-serving/src/components/deploymentWizard/fields/AvailableAiAssetsFields';
import { RuntimeArgsFieldData } from '../../../model-serving/src/components/deploymentWizard/fields/RuntimeArgsField';
import { EnvironmentVariablesFieldData } from '../../../model-serving/src/components/deploymentWizard/fields/EnvironmentVariablesField';
import { CreateConnectionData } from '../../../model-serving/src/components/deploymentWizard/fields/CreateConnectionInputFields';

export const applyModelLocation = (
  llmdInferenceService: LLMInferenceServiceKind,
  modelLocationData: ModelLocationData,
  secretName?: string,
  createConnectionData?: CreateConnectionData,
  dryRun?: boolean,
): LLMInferenceServiceKind => {
  const result = structuredClone(llmdInferenceService);
  result.metadata.annotations = {
    ...result.metadata.annotations,
  };

  if (!dryRun) {
    // Only add the connection name in the actual request (dry run will fail if the connection doesn't exist yet)
    result.metadata.annotations[MetadataAnnotation.ConnectionName] =
      secretName ?? createConnectionData?.nameDesc?.name ?? '';
  } else {
    // Remove the connection name in the dry run or it will conflict during updates
    delete result.metadata.annotations[MetadataAnnotation.ConnectionName];
  }
  // Adds path annotation for S3
  if (
    modelLocationData.additionalFields.modelPath &&
    modelLocationData.connectionTypeObject &&
    isModelServingCompatible(
      modelLocationData.connectionTypeObject ?? [],
      ModelServingCompatibleTypes.S3ObjectStorage,
    )
  ) {
    result.metadata.annotations['opendatahub.io/connection-path'] =
      modelLocationData.additionalFields.modelPath;
  } else {
    delete result.metadata.annotations['opendatahub.io/connection-path'];
  }
  // Adds uri for OCI
  if (
    modelLocationData.additionalFields.modelUri &&
    modelLocationData.connectionTypeObject &&
    isModelServingCompatible(
      modelLocationData.connectionTypeObject ?? [],
      ModelServingCompatibleTypes.OCI,
    )
  ) {
    result.spec.model = {
      ...result.spec.model,
      uri: modelLocationData.additionalFields.modelUri,
    };
  }
  return result;
};

export const extractModelFormat = (): SupportedModelFormats | null => {
  return null;
};

/**
 * Helper function to ensure the main container exists and return a cloned service with the container
 */
export const structuredCloneWithMainContainer = (
  llmdInferenceService: LLMInferenceServiceKind,
): {
  result: LLMInferenceServiceKind;
  mainContainer: LLMdContainer;
} => {
  const result = structuredClone(llmdInferenceService);
  if (!result.spec.template) {
    result.spec.template = {
      containers: [],
    };
  }
  let mainContainer = result.spec.template.containers?.find(
    (container) => container.name === 'main',
  );
  if (!mainContainer) {
    mainContainer = {
      name: 'main',
    };
    result.spec.template.containers?.push(mainContainer);
  }
  return { result, mainContainer };
};

export const applyModelArgs = (
  llmdInferenceService: LLMInferenceServiceKind,
  modelArgs?: RuntimeArgsFieldData,
): LLMInferenceServiceKind => {
  const { result, mainContainer } = structuredCloneWithMainContainer(llmdInferenceService);
  if (!modelArgs?.enabled) {
    delete mainContainer.args;
    return result;
  }
  mainContainer.args = modelArgs.args;
  return result;
};

export const applyModelEnvVars = (
  llmdInferenceService: LLMInferenceServiceKind,
  modelEnvVars?: EnvironmentVariablesFieldData,
): LLMInferenceServiceKind => {
  const { result, mainContainer } = structuredCloneWithMainContainer(llmdInferenceService);
  if (!modelEnvVars?.enabled) {
    delete mainContainer.env;
    return result;
  }
  mainContainer.env = modelEnvVars.variables;
  return result;
};

export const extractRuntimeArgs = (
  llmdDeployment: LLMdDeployment,
): { enabled: boolean; args: string[] } | null => {
  const args =
    llmdDeployment.model.spec.template?.containers?.find((container) => container.name === 'main')
      ?.args || [];
  return {
    enabled: args.length > 0,
    args,
  };
};

export const extractEnvironmentVariables = (
  llmdDeployment: LLMdDeployment,
): { enabled: boolean; variables: { name: string; value: string }[] } | null => {
  const envVars =
    llmdDeployment.model.spec.template?.containers?.find((container) => container.name === 'main')
      ?.env || [];
  return {
    enabled: envVars.length > 0,
    variables: envVars.map((envVar) => ({
      name: envVar.name,
      value: String(envVar.value || ''),
    })),
  };
};

export const getModelLocationUri = (deployment: LLMInferenceServiceKind): string | undefined => {
  return deployment.spec.model.uri;
};

const extractAdditionalFields = (deployment: LLMInferenceServiceKind): Record<string, string> => {
  const additionalFields: Record<string, string> = {};
  const { model } = deployment.spec;

  const connectionType = getConnectionTypeFromUri(model.uri);
  if (connectionType === ModelServingCompatibleTypes.S3ObjectStorage) {
    additionalFields.modelPath =
      deployment.metadata.annotations?.['opendatahub.io/connection-path'] || '';
  }

  if (connectionType === ModelServingCompatibleTypes.OCI) {
    additionalFields.modelUri = model.uri || '';
  }

  return additionalFields;
};

export const extractModelLocationData = (deployment: {
  model: LLMInferenceServiceKind;
}): ModelLocationData => {
  const uri = getModelLocationUri(deployment.model);
  if (uri && isPVCUri(uri)) {
    return {
      type: ModelLocationType.PVC,
      fieldValues: { URI: uri },
      additionalFields: {
        pvcConnection: getPVCNameFromURI(uri),
      },
    };
  }
  const imagePullSecrets = deployment.model.spec.template?.containers?.find(
    (container) => container.name === 'imagePullSecrets',
  );
  const connectionName =
    deployment.model.metadata.annotations?.[MetadataAnnotation.ConnectionName] ||
    imagePullSecrets?.name;

  const additionalFields = extractAdditionalFields(deployment.model);

  if (connectionName) {
    return {
      type: ModelLocationType.EXISTING,
      connection: connectionName,
      fieldValues: {},
      additionalFields,
    };
  }

  return {
    type: ModelLocationType.NEW,
    fieldValues: { URI: uri },
    additionalFields,
  };
};

export const getConnectionTypeFromUri = (uri: string): ModelServingCompatibleTypes => {
  const uriProtocol = uri.split('://')[0];
  switch (uriProtocol) {
    case 's3':
      return ModelServingCompatibleTypes.S3ObjectStorage;
    case 'oci':
      return ModelServingCompatibleTypes.OCI;
    default:
      return ModelServingCompatibleTypes.URI;
  }
};

export const extractAiAssetData = (
  llmdInferenceService: LLMdDeployment,
): AvailableAiAssetsFieldsData => {
  return {
    saveAsAiAsset:
      llmdInferenceService.model.metadata.labels?.['opendatahub.io/genai-asset'] === 'true',
    useCase:
      llmdInferenceService.model.metadata.annotations?.['opendatahub.io/genai-use-case'] || '',
  };
};

export const applyAiAvailableAssetAnnotations = (
  llmdInferenceService: LLMInferenceServiceKind,
  aiAssetData?: AvailableAiAssetsFieldsData,
): LLMInferenceServiceKind => {
  const result = structuredClone(llmdInferenceService);
  result.metadata.labels = {
    ...result.metadata.labels,
    'opendatahub.io/genai-asset': aiAssetData?.saveAsAiAsset ? 'true' : 'false',
  };
  if (!aiAssetData?.saveAsAiAsset) {
    delete result.metadata.labels['opendatahub.io/genai-asset'];
  }
  result.metadata.annotations = {
    ...result.metadata.annotations,
    ...(aiAssetData?.saveAsAiAsset &&
      aiAssetData.useCase && {
        'opendatahub.io/genai-use-case': aiAssetData.useCase,
      }),
  };
  if (!aiAssetData?.saveAsAiAsset || !aiAssetData.useCase) {
    delete result.metadata.annotations['opendatahub.io/genai-use-case'];
  }

  return result;
};

export const applyDisplayNameDesc = (
  inferenceService: LLMInferenceServiceKind,
  name?: string,
  description?: string,
): LLMInferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.metadata.annotations = {
    ...(result.metadata.annotations ?? {}),
    'openshift.io/display-name': name ?? inferenceService.metadata.name,
    'openshift.io/description': description ?? '',
  };
  if (!description || description === '') {
    delete result.metadata.annotations['openshift.io/description'];
  }

  return result;
};

export const applyDashboardResourceLabel = (
  inferenceService: LLMInferenceServiceKind,
): LLMInferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.metadata.labels = {
    ...(result.metadata.labels ?? {}),
    [KnownLabels.DASHBOARD_RESOURCE]: 'true',
  };
  return result;
};
