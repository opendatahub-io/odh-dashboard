import { ConfigPair } from './ModelConfigPairsEditor';
import {
  ProviderReferenceApiFormat,
  validateExternalModelFieldLength,
} from './providerReferenceUtils';

export type ProviderReferenceFormData = {
  apiFormat: ProviderReferenceApiFormat;
  path: string;
  targetModel: string;
  weight: number;
  configPairs: ConfigPair[];
};

export const validateProviderReferenceForm = (
  form: ProviderReferenceFormData,
): string | undefined => {
  if (!form.apiFormat.trim()) {
    return 'API format is required';
  }
  if (!form.path.trim()) {
    return 'Path is required';
  }
  const trimmedTargetModel = form.targetModel.trim();
  if (!trimmedTargetModel) {
    return 'Target model ID is required';
  }
  const targetModelFieldError = validateExternalModelFieldLength(
    trimmedTargetModel,
    'Target model ID',
  );
  if (targetModelFieldError) {
    return targetModelFieldError;
  }
  if (form.weight < 0 || form.weight > 100) {
    return 'Weight must be between 0 and 100';
  }
  return undefined;
};
