import { z } from 'zod';
import { ValidationContextType } from '~/utilities/useValidation';

const createResourceSchema = (field: string) =>
  z
    .string()
    .trim()
    .superRefine((data, ctx) => {
      if (data.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          message: `The ${field} cannot be empty`,
          minimum: 1,
          inclusive: true,
          type: 'string',
        });
      }
      if (data.length > 500) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_big,
          message: `The ${field} cannot have over 500 characters`,
          maximum: 500,
          inclusive: true,
          type: 'string',
        });
      }
    });

export const resourceLabelIdentifierSchema = z.object({
  resourceLabel: createResourceSchema('resource label'),
  resourceIdentifier: createResourceSchema('resource identifier'),
});

export type NodeResourceModalFormData = z.infer<typeof resourceLabelIdentifierSchema>;

export const isResourceLabelValid = (
  validation: ValidationContextType<{
    resourceLabel: string;
    resourceIdentifier: string;
  }>,
): boolean =>
  validation.hasValidationIssue(['resourceLabel'], z.ZodIssueCode.too_small) ||
  validation.hasValidationIssue(['resourceLabel'], z.ZodIssueCode.too_big);

export const isResourceIdentifierValid = (
  validation: ValidationContextType<{
    resourceLabel: string;
    resourceIdentifier: string;
  }>,
): boolean =>
  validation.hasValidationIssue(['resourceIdentifier'], z.ZodIssueCode.too_small) ||
  validation.hasValidationIssue(['resourceIdentifier'], z.ZodIssueCode.too_big);

export const getResourceLabelErrorMessage = (
  validation: ValidationContextType<{
    resourceLabel: string;
    resourceIdentifier: string;
  }>,
): string | undefined => {
  if (validation.hasValidationIssue(['resourceLabel'], z.ZodIssueCode.too_small)) {
    return validation.getValidationIssue(['resourceLabel'], z.ZodIssueCode.too_small)?.message;
  }
  if (validation.hasValidationIssue(['resourceLabel'], z.ZodIssueCode.too_big)) {
    return validation.getValidationIssue(['resourceLabel'], z.ZodIssueCode.too_big)?.message;
  }
  return undefined;
};

export const getResourceIdentifierErrorMessage = (
  validation: ValidationContextType<{
    resourceLabel: string;
    resourceIdentifier: string;
  }>,
): string | undefined => {
  if (validation.hasValidationIssue(['resourceIdentifier'], z.ZodIssueCode.too_small)) {
    return validation.getValidationIssue(['resourceIdentifier'], z.ZodIssueCode.too_small)?.message;
  }
  if (validation.hasValidationIssue(['resourceIdentifier'], z.ZodIssueCode.too_big)) {
    return validation.getValidationIssue(['resourceIdentifier'], z.ZodIssueCode.too_big)?.message;
  }
  return undefined;
};
