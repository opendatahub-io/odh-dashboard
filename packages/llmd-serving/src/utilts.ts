import type { RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { WizardFormData } from '@odh-dashboard/model-serving/types/form-data';

/**
 * Pre 3.4: true if "LLM-d" runtime selected
 *
 * Post 3.4: true if "Generative" and not legacy mode
 */
export const isLLMdActive = (
  wizardFormData: RecursivePartial<WizardFormData['state']>,
): boolean => {
  return (
    wizardFormData.modelType?.data?.type === ServingRuntimeModelType.GENERATIVE &&
    wizardFormData.modelType.data.legacyVLLM !== true
  );
};
