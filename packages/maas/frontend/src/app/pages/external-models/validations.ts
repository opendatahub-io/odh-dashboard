import { z } from 'zod';
import { ExternalProvider } from '~/app/types/external-models';
import { ConfigPair } from '~/app/utilities/configPairs';
import {
  EXTERNAL_MODEL_FIELD_MAX_LENGTH,
  PROVIDER_REFERENCE_PATH_MAX_LENGTH,
  ProviderReferenceApiFormat,
} from './const';
import { recordToConfigPairs } from './providerReferenceUtils';

const PROVIDER_REFERENCE_PATH_PATTERN = /^\/.*/;
/** Resolved automatically from Target model ID; not required in provider/model config. */
const PROVIDER_REFERENCE_PATH_MODEL_PLACEHOLDER = 'model';
const PATH_PLACEHOLDER_PATTERN = /\{([^{}]+)\}/g;

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

export type ProviderReferenceFieldTouched = {
  targetModel?: boolean;
  path?: boolean;
};

export type ProviderReferenceValidationContext = {
  inheritedConfig?: Record<string, string>;
};

export const getUtf8ByteLength = (value: string): number => new TextEncoder().encode(value).length;

export const hasControlCharacters = (value: string): boolean =>
  [...value].some((char) => {
    const code = char.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });

export const validateExternalModelFieldLength = (
  value: string,
  fieldLabel: string,
): string | undefined => {
  if (getUtf8ByteLength(value) > EXTERNAL_MODEL_FIELD_MAX_LENGTH) {
    return `${fieldLabel} cannot exceed ${EXTERNAL_MODEL_FIELD_MAX_LENGTH} bytes`;
  }
  if (hasControlCharacters(value)) {
    return `${fieldLabel} cannot contain control characters or newlines`;
  }
  return undefined;
};

export const validateProviderReferencePath = (value: string): string | undefined => {
  const trimmedPath = value.trim();
  if (!trimmedPath) {
    return 'Path is required';
  }
  if (!PROVIDER_REFERENCE_PATH_PATTERN.test(trimmedPath)) {
    return 'Path must start with /';
  }
  if (getUtf8ByteLength(trimmedPath) > PROVIDER_REFERENCE_PATH_MAX_LENGTH) {
    return `Path cannot exceed ${PROVIDER_REFERENCE_PATH_MAX_LENGTH} bytes`;
  }
  if (hasControlCharacters(trimmedPath)) {
    return 'Path cannot contain control characters or newlines';
  }
  return undefined;
};

export const extractPathPlaceholders = (path: string): string[] => {
  const placeholders = [...path.matchAll(PATH_PLACEHOLDER_PATTERN)]
    .map((match) => match[1].trim())
    .filter(Boolean);

  return [...new Set(placeholders)];
};

export const mergeProviderReferenceConfig = (
  configPairs: ConfigPair[],
  inheritedConfig?: Record<string, string>,
): Record<string, string> => {
  const merged = { ...(inheritedConfig ?? {}) };
  configPairs.forEach((pair) => {
    const key = pair.key.trim();
    if (key) {
      merged[key] = pair.value;
    }
  });
  return merged;
};

export const getMissingPathPlaceholders = (
  path: string,
  config: Record<string, string>,
): string[] =>
  extractPathPlaceholders(path).filter(
    (placeholder) =>
      placeholder !== PROVIDER_REFERENCE_PATH_MODEL_PLACEHOLDER && !(placeholder in config),
  );

export const formatMissingPathPlaceholderError = (missingPlaceholders: string[]): string => {
  const formattedPlaceholders = missingPlaceholders.map((key) => `{${key}}`).join(', ');
  return `Missing values for: ${formattedPlaceholders}. Set them in Advanced settings under Model configuration, or on the provider.`;
};

export const validateProviderReferencePathPlaceholders = (
  path: string,
  inheritedConfig?: Record<string, string>,
  configPairs: ConfigPair[] = [],
): string | undefined => {
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    return undefined;
  }

  const mergedConfig = mergeProviderReferenceConfig(configPairs, inheritedConfig);
  const missingPlaceholders = getMissingPathPlaceholders(trimmedPath, mergedConfig);
  if (missingPlaceholders.length === 0) {
    return undefined;
  }

  return formatMissingPathPlaceholderError(missingPlaceholders);
};

export const validateProviderRefPathPlaceholders = (
  path: string,
  inheritedConfig?: Record<string, string>,
  modelConfig?: Record<string, string>,
): string | undefined =>
  validateProviderReferencePathPlaceholders(
    path,
    inheritedConfig,
    recordToConfigPairs(modelConfig),
  );

export const getProviderReferenceFieldErrors = (
  form: ProviderReferenceFormData,
  context?: ProviderReferenceValidationContext,
): ProviderReferenceFieldErrors => {
  const errors: ProviderReferenceFieldErrors = {};

  const trimmedTargetModel = form.targetModel.trim();
  if (!trimmedTargetModel) {
    errors.targetModel = 'Target model ID is required';
  } else {
    const targetModelError = validateExternalModelFieldLength(
      trimmedTargetModel,
      'Target model ID',
    );
    if (targetModelError) {
      errors.targetModel = targetModelError;
    }
  }

  const pathError = validateProviderReferencePath(form.path);
  if (pathError) {
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

  return errors;
};

export const isProviderReferenceFormIncomplete = (
  form: ProviderReferenceFormData,
  context?: ProviderReferenceValidationContext,
): boolean => Object.keys(getProviderReferenceFieldErrors(form, context)).length > 0;

/** Field errors for display — after blur, or immediately when the field has a value. */
export const getVisibleProviderReferenceFieldErrors = (
  form: ProviderReferenceFormData,
  errors: ProviderReferenceFieldErrors,
  touched: ProviderReferenceFieldTouched,
): ProviderReferenceFieldErrors => {
  const visible: ProviderReferenceFieldErrors = {};

  if (errors.targetModel && (touched.targetModel || form.targetModel.trim())) {
    visible.targetModel = errors.targetModel;
  }
  if (errors.path && (touched.path || form.path.trim())) {
    visible.path = errors.path;
  }

  return visible;
};

export const validateProviderReferenceForm = (
  form: ProviderReferenceFormData,
  context?: ProviderReferenceValidationContext,
): string | undefined => {
  if (!form.apiFormat.trim()) {
    return 'API format is required';
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

export const createExternalModelFormSchema = (
  externalProviders: ExternalProvider[],
): z.ZodObject<{
  modelName: z.ZodType<string>;
  providerRefs: z.ZodType<
    Array<{
      targetModel: string;
      path: string;
      providerName: string;
      config?: Record<string, string>;
    }>
  >;
}> =>
  z.object({
    modelName: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .superRefine((value, ctx) => {
        const error = validateExternalModelFieldLength(value, 'Name');
        if (error) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
        }
      }),
    providerRefs: z
      .array(
        z
          .object({
            targetModel: z.string(),
            path: z.string(),
            providerName: z.string(),
            config: z.record(z.string()).optional(),
          })
          .passthrough(),
      )
      .min(1, 'Add at least one provider reference')
      .superRefine((refs, ctx) => {
        refs.forEach((ref, index) => {
          const targetModelError = validateExternalModelFieldLength(
            ref.targetModel.trim(),
            'Target model ID',
          );
          if (targetModelError) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: targetModelError,
              path: [index, 'targetModel'],
            });
          }

          const pathError = validateProviderReferencePath(ref.path);
          if (pathError) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: pathError,
              path: [index, 'path'],
            });
          } else {
            const provider = externalProviders.find((item) => item.name === ref.providerName);
            const placeholderError = validateProviderRefPathPlaceholders(
              ref.path,
              provider?.config,
              ref.config,
            );
            if (placeholderError) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: placeholderError,
                path: [index, 'path'],
              });
            }
          }
        });
      }),
  });
