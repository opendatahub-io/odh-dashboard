import { z } from 'zod';
import { IdentifierResourceType, TolerationEffect, TolerationOperator } from '~/types';
import {
  validateDefaultCount,
  validateMinCount,
} from '~/pages/hardwareProfiles/nodeResource/utils';
import { CPU_UNITS, MEMORY_UNITS_FOR_SELECTION } from '~/utilities/valueUnits';

export const identifierSchema = z
  .object({
    displayName: z.string(),
    identifier: z.string(),
    resourceType: z.nativeEnum(IdentifierResourceType).optional(),
    defaultCount: z.union([z.string(), z.number()]),
    minCount: z.union([z.string(), z.number()]),
    maxCount: z.union([z.string(), z.number()]).optional(),
  })
  .superRefine((identifier, ctx) => {
    const unitOptions =
      identifier.resourceType === IdentifierResourceType.CPU
        ? CPU_UNITS
        : identifier.resourceType === IdentifierResourceType.MEMORY
        ? MEMORY_UNITS_FOR_SELECTION
        : undefined;

    if (!validateDefaultCount(identifier, unitOptions)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['defaultCount'],
        message: 'Default must be within the valid range.',
      });
    }

    if (!validateMinCount(identifier, unitOptions)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minCount'],
        message: 'Min count must not exceed max count.',
      });
    }
  });

export const tolerationSchema = z.object({
  key: z.string().trim().min(1, 'Key is required'),
  operator: z.nativeEnum(TolerationOperator).optional(),
  value: z.string().optional(),
  effect: z.nativeEnum(TolerationEffect).optional(),
  tolerationSeconds: z.number().optional(),
});

export const nodeSelectorSchema = z.record(z.string().min(1), z.string().min(1));

export const manageHardwareProfileValidationSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required'),
  enabled: z.boolean(),
  identifiers: z.array(identifierSchema),
  tolerations: z.array(tolerationSchema).optional(),
  nodeSelector: nodeSelectorSchema.optional(),
  name: z
    .string()
    .trim()
    .min(1)
    .max(253)
    .regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/),
  description: z.string().optional(),
  visibility: z.array(z.string()),
});
