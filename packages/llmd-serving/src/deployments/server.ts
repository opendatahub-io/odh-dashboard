import type { ModelServerSelectFieldData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ModelServerTemplateSelectField';
import type { LLMdDeployment } from '../types';

export const LLMD_OPTION = {
  name: 'llmd-serving',
  label: 'Distributed inference with llm-d',
};

export const extractModelServerTemplate = (
  LLMdDeployment: LLMdDeployment,
): ModelServerSelectFieldData => {
  if (LLMdDeployment.server) {
    return {
      selection: {
        name: LLMdDeployment.server.metadata.name,
        namespace: LLMdDeployment.server.metadata.namespace,
        label: LLMdDeployment.server.metadata.annotations?.['openshift.io/display-name'],
        template: LLMdDeployment.server,
        version: LLMdDeployment.server.metadata.annotations?.['opendatahub.io/runtime-version'],
      },
    };
  }
  return {
    selection: {
      name: 'llmd-serving',
      label: 'Distributed inference with llm-d',
    },
  };
};
