import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type {
  ModelServerTemplateField,
  WizardFormData,
} from '@odh-dashboard/model-serving/types/form-data';
import { LLMD_SERVING_ID } from '../../extensions/extensions';

export const modelServerField: ModelServerTemplateField = {
  id: 'modelServerTemplate',
  type: 'modifier',
  isActive: (data: Partial<WizardFormData['state']>): boolean => {
    return data.modelType?.data === ServingRuntimeModelType.GENERATIVE;
  },
  modifier: (stateInput, stateOutput) => {
    const { options } = stateOutput;
    if (!options.find((o) => o.name === LLMD_SERVING_ID)) {
      options.unshift({
        name: LLMD_SERVING_ID,
        label: 'Distributed Inference Server with llm-d',
      });
    }
    return { ...stateOutput, options };
  },
};
