import { z } from 'zod';
import { AuthMechanism } from '~/app/types/external-models';
import { ENDPOINT_FQDN_PATTERN, K8S_SECRET_NAME_PATTERN } from './const';
import { ConfigPair } from './types';

const authMechanismSchema = z.enum(['apikey', 'sigv4', 'oauth2']);

export const AUTH_MECHANISM_VALUES = authMechanismSchema.options;

export const getConfigPairsValidationError = (pairs: ConfigPair[]): string | undefined => {
  for (const { key, value } of pairs) {
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();

    if (!trimmedKey && !trimmedValue) {
      continue;
    }

    if (!trimmedKey || !trimmedValue) {
      return 'Each configuration pair must include both a key and a value';
    }

    if (/\s/.test(key)) {
      return 'Configuration keys cannot contain spaces';
    }
  }

  return undefined;
};

export const createExternalProviderFormSchema = z
  .object({
    provider: z.string().min(1, 'Provider type is required'),
    endpointUrl: z
      .string()
      .min(1, 'Endpoint is required')
      .max(253, 'Endpoint must be at most 253 characters')
      .refine((value) => ENDPOINT_FQDN_PATTERN.test(value.trim()), {
        message: 'Endpoint must be an FQDN with no scheme or path (for example, api.openai.com)',
      }),
    authMechanism: authMechanismSchema,
    credentialSecretRef: z.string().min(1, 'Credential secret is required'),
    isNewSecret: z.boolean(),
    secretValue: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const secretName = data.credentialSecretRef.trim();
    if (!K8S_SECRET_NAME_PATTERN.test(secretName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Secret name must be a valid Kubernetes resource name (lowercase letters, numbers, and dashes)',
        path: ['credentialSecretRef'],
      });
    }
    if (data.isNewSecret) {
      if (!data.secretValue?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'API key value is required when creating a new secret',
          path: ['secretValue'],
        });
      }
    }
  });

export type CreateExternalProviderFormData = z.infer<typeof createExternalProviderFormSchema>;

export const isAuthMechanism = (value: string): value is AuthMechanism =>
  authMechanismSchema.safeParse(value).success;
