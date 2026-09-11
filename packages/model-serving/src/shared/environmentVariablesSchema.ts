import { z } from 'zod';
import {
  EnvironmentVariableType,
  isValidSecretDataKey,
  isValidSecretName,
  SECRET_DATA_KEY_VALIDATION_ERROR,
  SECRET_NAME_VALIDATION_ERROR,
  type EnvironmentVariable,
} from './environmentVariablesUtils';

export const envVarNameSchema = z
  .string()
  .regex(
    /^[A-Za-z_][A-Za-z0-9_]*$/,
    'Environment variable name must start with a letter or underscore and contain only letters, numbers, and underscores',
  );

const valueEnvVarSchema = z.object({
  type: z.literal(EnvironmentVariableType.Value),
  name: envVarNameSchema,
  value: z.string(),
});

const secretEnvVarSchema = z.object({
  type: z.literal(EnvironmentVariableType.Secret),
  name: envVarNameSchema,
  secretName: z
    .string()
    .min(1, 'Secret name is required')
    .refine(isValidSecretName, SECRET_NAME_VALIDATION_ERROR),
  secretKey: z
    .string()
    .min(1, 'Secret key is required')
    .refine(isValidSecretDataKey, SECRET_DATA_KEY_VALIDATION_ERROR),
  optional: z.boolean().optional(),
});

export const enabledEnvVarSchema = z.discriminatedUnion('type', [
  valueEnvVarSchema,
  secretEnvVarSchema,
]);

export const isCompleteEnvironmentVariable = (envVar: EnvironmentVariable): boolean =>
  enabledEnvVarSchema.safeParse(envVar).success;

const getSchemaFieldError = (envVar: EnvironmentVariable, field: string): string => {
  const result = enabledEnvVarSchema.safeParse(envVar);
  if (result.success) {
    return '';
  }

  return (
    result.error.issues.find((issue) => issue.path.length === 1 && issue.path[0] === field)
      ?.message ?? ''
  );
};

export const getEnvironmentVariableFieldErrors = (
  envVar: EnvironmentVariable,
): { nameError: string; secretNameError: string; secretKeyError: string } => ({
  nameError: getSchemaFieldError(envVar, 'name'),
  secretNameError:
    envVar.type === EnvironmentVariableType.Secret ? getSchemaFieldError(envVar, 'secretName') : '',
  secretKeyError:
    envVar.type === EnvironmentVariableType.Secret ? getSchemaFieldError(envVar, 'secretKey') : '',
});
