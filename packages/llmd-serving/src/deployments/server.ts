import type {
  ModelServerOption,
  ModelServerSelectFieldData,
} from '@odh-dashboard/model-serving/shared/wizard-fields';
import type { LLMdDeployment, LLMInferenceServiceKind } from '../types';
import { isLLMd } from '../formUtils';

export const LLMD_OPTION = {
  name: 'llmd-serving',
  label: 'Distributed inference with llm-d',
};

// No backing template: preserve the custom service's existing configuration on edit.
export const CUSTOM_LLM_INFERENCE_SERVICE_OPTION: ModelServerOption = {
  name: 'custom-llm-inference-service',
  label: 'Custom LLMInferenceService',
};

export const extractModelServerTemplate = (
  LLMdDeployment: LLMdDeployment,
): { data: ModelServerSelectFieldData } => {
  if (LLMdDeployment.server) {
    return {
      data: {
        selection: {
          name: LLMdDeployment.server.metadata.name,
          namespace: LLMdDeployment.server.metadata.namespace,
          label: LLMdDeployment.server.metadata.annotations?.['openshift.io/display-name'],
          template: LLMdDeployment.server,
          version: LLMdDeployment.server.metadata.annotations?.['opendatahub.io/runtime-version'],
        },
      },
    };
  }
  return {
    data: {
      selection: isLLMd(LLMdDeployment) ? LLMD_OPTION : CUSTOM_LLM_INFERENCE_SERVICE_OPTION,
    },
  };
};

/**
 * Insert / remove a single config reference selected from form.
 * `baseRef` must be same name as the LLMInferenceService.
 * - If baseRef is not provided, the baseRef is removed if present
 * - If baseRef is provided, it makes sure it's added if not present
 */
export const applyConfigBaseRef = (
  llmdInferenceService: LLMInferenceServiceKind,
  baseRef?: string,
): LLMInferenceServiceKind => {
  const result = structuredClone(llmdInferenceService);
  const k8sName = llmdInferenceService.metadata.name;
  if (baseRef && baseRef !== k8sName) {
    console.warn(
      `Setting baseRef with different name than the LLMInferenceService: ${baseRef} !== ${k8sName} is not supported`,
    );
  }

  // Add or remove baseRef
  if (baseRef && !result.spec.baseRefs?.some((ref) => ref.name === baseRef)) {
    result.spec.baseRefs = [...(result.spec.baseRefs ?? []), { name: baseRef }];
  } else if (!baseRef && result.spec.baseRefs?.find((ref) => ref.name === k8sName)) {
    result.spec.baseRefs = result.spec.baseRefs.filter((ref) => ref.name !== k8sName);
  }

  return result;
};
