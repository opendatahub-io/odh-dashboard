import { useMemo } from 'react';
import { z, ZodIssue } from 'zod';
import { useValidation } from '@odh-dashboard/internal/utilities/useValidation';
import { RateLimit } from '~/app/types/tier';

const rateLimitSchema = z.object({
  tokens: z.number().min(1, 'Must be greater than 0'),
  time: z.number().min(1, 'Must be greater than 0'),
  unit: z.enum(['hour', 'minute', 'second', 'millisecond']),
});

/**
 * Schema for the rate limits section.
 * When enabled, at least one rate limit with valid values is required.
 */
const rateLimitsEnabledSchema = z.object({
  enabled: z.literal(true),
  rateLimits: z.array(rateLimitSchema).min(1, 'At least one rate limit is required'),
});

const rateLimitsDisabledSchema = z.object({
  enabled: z.literal(false),
  rateLimits: z.array(rateLimitSchema),
});

const rateLimitsSectionSchema = z.discriminatedUnion('enabled', [
  rateLimitsEnabledSchema,
  rateLimitsDisabledSchema,
]);

export const createTierFormSchema = z.object({
  // Name validation is handled by K8sNameDescriptionField
  name: z.string(),
  level: z.number().min(1, 'Level must be at least 1').max(999, 'Level must be at most 999'),
  groups: z.array(z.string()).min(1, 'At least one group is required'),
  tokenRateLimits: rateLimitsSectionSchema,
  requestRateLimits: rateLimitsSectionSchema,
});

export type CreateTierFormData = z.infer<typeof createTierFormSchema>;

type UseCreateTierFormValidationProps = {
  name: string;
  level: number;
  groups: string[];
  tokenLimitEnabled: boolean;
  tokenLimits: RateLimit[];
  requestLimitEnabled: boolean;
  requestLimits: RateLimit[];
};

type UseCreateTierFormValidationReturn = {
  isValid: boolean;
  validationResult: Omit<z.SafeParseReturnType<CreateTierFormData, CreateTierFormData>, 'data'>;
  getAllValidationIssues: (path?: (string | number)[]) => ZodIssue[];
  formData: CreateTierFormData;
};

export const useCreateTierFormValidation = ({
  name,
  level,
  groups,
  tokenLimitEnabled,
  tokenLimits,
  requestLimitEnabled,
  requestLimits,
}: UseCreateTierFormValidationProps): UseCreateTierFormValidationReturn => {
  const formData: CreateTierFormData = useMemo(
    () => ({
      name,
      level,
      groups,
      tokenRateLimits: {
        enabled: tokenLimitEnabled,
        rateLimits: tokenLimits,
      },
      requestRateLimits: {
        enabled: requestLimitEnabled,
        rateLimits: requestLimits,
      },
    }),
    [name, level, groups, tokenLimitEnabled, tokenLimits, requestLimitEnabled, requestLimits],
  );

  const { validationResult, getAllValidationIssues } = useValidation(
    formData,
    createTierFormSchema,
  );

  return {
    isValid: validationResult.success,
    validationResult,
    getAllValidationIssues,
    formData,
  };
};
