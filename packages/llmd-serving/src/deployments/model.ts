import { MetadataAnnotation, type SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes';
import {
  isModelServingCompatible,
  ModelServingCompatibleTypes,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import type { LLMdContainer, LLMInferenceServiceKind } from '../types';
import { ModelLocationData } from '../../../model-serving/src/components/deploymentWizard/fields/modelLocationFields/types';

export const applyModelLocation = (
  llmdInferenceService: LLMInferenceServiceKind,
  modelLocationData: ModelLocationData,
  secretName?: string,
  dryRun?: boolean,
  // will also need to pass in createConnectionData
): LLMInferenceServiceKind => {
  const result = structuredClone(llmdInferenceService);
  result.metadata.annotations = {
    ...result.metadata.annotations,
  };
  if (!dryRun) {
    // Only add the connection name in the actual request (dry run will fail if the connection doesn't exist yet)
    result.metadata.annotations[MetadataAnnotation.ConnectionName] =
      modelLocationData.connection ?? secretName ?? ''; // TODO add saveConnectionData once 1C merges
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
