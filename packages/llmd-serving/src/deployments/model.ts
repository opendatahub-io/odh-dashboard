import { MetadataAnnotation, type SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes';
import { ModelServingCompatibleTypes } from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import {
  getPVCNameFromURI,
  isPVCUri,
} from '@odh-dashboard/internal/pages/modelServing/screens/projects/utils';
import type { LLMdContainer, LLMInferenceServiceKind, LLMdDeployment } from '../types';
import {
  ModelLocationData,
  ModelLocationType,
} from '../../../model-serving/src/components/deploymentWizard/fields/modelLocationFields/types';
import { AvailableAiAssetsFieldsData } from '../../../model-serving/src/components/deploymentWizard/fields/AvailableAiAssetsFields';

export const applyModelLocation = (
  llmdInferenceService: LLMInferenceServiceKind,
  modelLocation: string,
): LLMInferenceServiceKind => {
  const result = structuredClone(llmdInferenceService);
  result.metadata.annotations = {
    ...result.metadata.annotations,
    [MetadataAnnotation.ConnectionName]: modelLocation, // TODO add saveConnectionData once 1C merges
  };
  return result;
};

export const extractModelFormat = (): SupportedModelFormats | null => {
  return null;
};

/**
 * Helper function to ensure the main container exists and return a cloned service with the container
 */
const structuredCloneWithMainContainer = (
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
  modelArgs?: string[],
): LLMInferenceServiceKind => {
  if (!modelArgs) {
    return llmdInferenceService;
  }
  const { result, mainContainer } = structuredCloneWithMainContainer(llmdInferenceService);
  mainContainer.args = modelArgs;
  return result;
};

export const applyModelEnvVars = (
  llmdInferenceService: LLMInferenceServiceKind,
  modelEnvVars?: { name: string; value: string }[],
): LLMInferenceServiceKind => {
  if (!modelEnvVars) {
    return llmdInferenceService;
  }
  const { result, mainContainer } = structuredCloneWithMainContainer(llmdInferenceService);
  mainContainer.env = modelEnvVars;
  return result;
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
      llmdInferenceService.model.metadata.annotations?.['opendatahub.io/genai-asset'] === 'true',
    useCase:
      llmdInferenceService.model.metadata.annotations?.['opendatahub.io/genai-use-case'] || '',
  };
};

export const applyAiAvailableAssetAnnotations = (
  llmdInferenceService: LLMInferenceServiceKind,
  aiAssetData: AvailableAiAssetsFieldsData,
): LLMInferenceServiceKind => {
  const result = structuredClone(llmdInferenceService);
  const annotations = {
    ...result.metadata.annotations,
  };
  if (aiAssetData.saveAsAiAsset) {
    annotations['opendatahub.io/genai-asset'] = 'true';
    if (aiAssetData.useCase) {
      annotations['opendatahub.io/genai-use-case'] = aiAssetData.useCase;
    }
  } else {
    delete annotations['opendatahub.io/genai-asset'];
    delete annotations['opendatahub.io/genai-use-case'];
  }
  result.metadata.annotations = annotations;
  return result;
};
