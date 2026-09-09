import { ConfigPair } from './ModelConfigPairsEditor';
import { ProviderReferenceApiFormat } from './providerReferenceUtils';

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
  if (!form.targetModel.trim()) {
    return 'Target model ID is required';
  }
  if (form.weight < 0 || form.weight > 100) {
    return 'Weight must be between 0 and 100';
  }
  return undefined;
};
