import type { ModelServerSelectFieldData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ModelServerTemplateSelectField';
import type { LLMdDeployment, LLMInferenceServiceKind } from '../types';

export const LLMD_OPTION = {
  name: 'llmd-serving',
  label: 'Distributed inference with llm-d',
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
      selection: {
        name: 'llmd-serving',
        label: 'Distributed inference with llm-d',
      },
    },
  };
};

/**
 * Insert / remove a single config reference selected from form
 * If baseRef is not provided, the baseRef is removed if present
 * If baseRef is provided, it makes sure it's added if not present
 */
export const applyConfigBaseRef = (
  llmdInferenceService: LLMInferenceServiceKind,
  baseRef?: string,
): LLMInferenceServiceKind => {
  const result = structuredClone(llmdInferenceService);

  if (baseRef && !result.spec.baseRefs?.some((ref) => ref.name === baseRef)) {
    result.spec.baseRefs = [...(result.spec.baseRefs ?? []), { name: baseRef }];
  } else if (!baseRef && result.spec.baseRefs?.find((ref) => ref.name === baseRef)) {
    result.spec.baseRefs = result.spec.baseRefs.filter((ref) => ref.name !== baseRef);
  }
  return result;
};
