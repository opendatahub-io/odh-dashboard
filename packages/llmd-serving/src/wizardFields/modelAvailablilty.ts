import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type {
  ModelAvailabilityField,
  WizardFormData,
} from '@odh-dashboard/model-serving/types/form-data';
import { LLMD_SERVING_ID } from '../../extensions/extensions';

export const modelServerField: ModelAvailabilityField = {
  id: 'modelAvailability',
  type: 'modifier',
  isActive: (data: Partial<WizardFormData['state']>): boolean => {
    return (
      data.modelType?.data === ServingRuntimeModelType.GENERATIVE &&
      data.modelServer?.data?.name === LLMD_SERVING_ID
    );
  },
  modifier: (stateInput, stateOutput) => {
    return { ...stateOutput, showSaveAsMaaS: true };
  },
};
