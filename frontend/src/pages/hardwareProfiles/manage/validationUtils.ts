import { z } from 'zod';
import { IdentifierResourceType, TolerationEffect, TolerationOperator } from '~/types';

const identifierSchema = z.object({
  displayName: z.string(),
  identifier: z.string(),
  resourceType: z.nativeEnum(IdentifierResourceType),
  defaultCount: z.union([z.string(), z.number()]),
  minCount: z.union([z.string(), z.number()]),
  maxCount: z.union([z.string(), z.number()]).optional(),
});

const tolerationSchema = z.object({
  key: z.string(),
  operator: z.nativeEnum(TolerationOperator).optional(),
  value: z.string().optional(),
  effect: z.nativeEnum(TolerationEffect).optional(),
  tolerationSeconds: z.number().optional(),
});

export const nodeSelectorSchema = z.record(z.string().min(1), z.string().min(1));

export const hardwareProfileValidationSchema = z.object({
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
  visibility: z.array(z.any()),
});
