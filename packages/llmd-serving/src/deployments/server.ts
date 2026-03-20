import type { ModelServerSelectFieldData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ModelServerTemplateSelectField';

export const LLMD_OPTION = {
  name: 'llmd-serving',
  label: 'Distributed inference with llm-d',
};

export const extractModelServerTemplate = (): ModelServerSelectFieldData => {
  return {
    selection: {
      name: 'llmd-serving',
      label: 'Distributed inference with llm-d',
    },
  };
};
