import { ConfigPair } from './ModelConfigPairsEditor';
import {
  ProviderReferenceApiFormat,
  validateExternalModelFieldLength,
  validateProviderReferencePath,
  validateProviderReferencePathPlaceholders,
} from './providerReferenceUtils';

export type ProviderReferenceHelperVariant = 'add' | 'edit';

export type ProviderReferenceFormData = {
  apiFormat: ProviderReferenceApiFormat;
  path: string;
  targetModel: string;
  weight: number;
  configPairs: ConfigPair[];
};

export type ProviderReferenceFieldErrors = {
  targetModel?: string;
  path?: string;
};

export type ProviderReferenceValidationContext = {
  inheritedConfig?: Record<string, string>;
};

/** True when a required field is empty — used to disable Add/Save. */
export const isProviderReferenceFormIncomplete = (form: ProviderReferenceFormData): boolean =>
  !form.targetModel.trim() || !form.path.trim();

/** Format/length errors for non-empty fields only (empty required fields are handled via incomplete). */
export const getProviderReferenceFieldErrors = (
  form: ProviderReferenceFormData,
  context?: ProviderReferenceValidationContext,
): ProviderReferenceFieldErrors => {
  const errors: ProviderReferenceFieldErrors = {};

  const trimmedTargetModel = form.targetModel.trim();
  if (trimmedTargetModel) {
    const targetModelError = validateExternalModelFieldLength(
      trimmedTargetModel,
      'Target model ID',
    );
    if (targetModelError) {
      errors.targetModel = targetModelError;
    }
  }

  const trimmedPath = form.path.trim();
  if (trimmedPath) {
    const pathError = validateProviderReferencePath(form.path);
    if (pathError && pathError !== 'Path is required') {
      errors.path = pathError;
    } else {
      const placeholderError = validateProviderReferencePathPlaceholders(
        form.path,
        context?.inheritedConfig,
        form.configPairs,
      );
      if (placeholderError) {
        errors.path = placeholderError;
      }
    }
  }

  return errors;
};

export const hasProviderReferenceFieldErrors = (
  form: ProviderReferenceFormData,
  context?: ProviderReferenceValidationContext,
): boolean => Object.keys(getProviderReferenceFieldErrors(form, context)).length > 0;

export const validateProviderReferenceForm = (
  form: ProviderReferenceFormData,
  context?: ProviderReferenceValidationContext,
): string | undefined => {
  if (!form.apiFormat.trim()) {
    return 'API format is required';
  }
  if (isProviderReferenceFormIncomplete(form)) {
    if (!form.targetModel.trim()) {
      return 'Target model ID is required';
    }
    return 'Path is required';
  }
  const fieldErrors = getProviderReferenceFieldErrors(form, context);
  if (fieldErrors.targetModel) {
    return fieldErrors.targetModel;
  }
  if (fieldErrors.path) {
    return fieldErrors.path;
  }
  if (form.weight < 0 || form.weight > 100) {
    return 'Weight must be between 0 and 100';
  }
  return undefined;
};
