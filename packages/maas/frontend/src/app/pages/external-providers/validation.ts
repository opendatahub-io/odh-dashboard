import { z } from 'zod';
import { AuthMechanism } from '~/app/types/external-models';
import { getConfigPairsValidationError } from '~/app/utilities/configPairs';
import { ENDPOINT_FQDN_PATTERN, K8S_SECRET_NAME_PATTERN } from './const';

const authMechanismSchema = z.enum(['apikey', 'sigv4', 'oauth2']);

export const AUTH_MECHANISM_VALUES = authMechanismSchema.options;

export { getConfigPairsValidationError };

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
    authMechanism: z
      .string()
      .min(1, 'Authentication is required')
      .refine((value): value is AuthMechanism => isAuthMechanism(value), {
        message: 'Authentication is required',
      }),
    credentialSecretRef: z.string().min(1, 'Credential secret is required'),
    isNewSecret: z.boolean(),
    secretValue: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const secretName = data.credentialSecretRef.trim();
    if (data.isNewSecret && !K8S_SECRET_NAME_PATTERN.test(secretName)) {
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
