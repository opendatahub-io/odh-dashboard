import { z } from 'zod';
import { IdentifierResourceType, TolerationEffect, TolerationOperator } from '~/types';
import {
  validateDefaultCount,
  validateMinCount,
} from '~/pages/hardwareProfiles/nodeResource/utils';
import { determineIdentifierUnit, splitValueUnit } from '~/utilities/valueUnits';
import { HardwareProfileWarningType } from '~/concepts/hardwareProfiles/types';
import { createIdentifierWarningMessage } from '~/pages/hardwareProfiles/utils';
import { HARDWARE_PROFILES_MISSING_CPU_MEMORY_MESSAGE } from '~/concepts/hardwareProfiles/const';
import { hasCPUandMemory } from './ManageNodeResourceSection';

export const baseIdentifierSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required'),
  identifier: z.string().trim().min(1, 'Identifier is required'),
  resourceType: z.nativeEnum(IdentifierResourceType).optional(),
  defaultCount: z.union([z.string(), z.number()]),
  minCount: z.union([z.string(), z.number()]),
  maxCount: z.union([z.string(), z.number()]).optional(),
});

export const identifierSchema = baseIdentifierSchema.superRefine((identifier, ctx) => {
  const unitOptions = determineIdentifierUnit(identifier);

  const checkNegative = (fieldName: string, value?: string | number) => {
    if (value?.toString().startsWith('-')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: createIdentifierWarningMessage(
          `${fieldName} for ${
            identifier.resourceType ?? identifier.displayName
          } cannot be negative.`,
        ),
        path: [fieldName],
      });
      return true;
    }
    return false;
  };

  const checkDecimal = (value: number, fieldName: string) => {
    if (!Number.isInteger(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: createIdentifierWarningMessage(
          `${fieldName} for ${
            identifier.resourceType ?? identifier.displayName
          } cannot be a decimal.`,
        ),
        params: { type: HardwareProfileWarningType.OTHER },
      });
    }
  };

  // 1. Validate minCount vs maxCount
  if (!validateMinCount(identifier, unitOptions)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: createIdentifierWarningMessage(
        `Minimum allowed ${
          identifier.resourceType ?? identifier.displayName
        } cannot exceed maximum allowed ${identifier.resourceType ?? identifier.displayName}.`,
      ),
      path: ['minCount'],
    });
  }

  // 2. Validate defaultCount is within range
  if (!validateDefaultCount(identifier, unitOptions)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: createIdentifierWarningMessage(
        `The default count for ${
          identifier.resourceType ?? identifier.displayName
        } must be between the minimum allowed ${
          identifier.resourceType ?? identifier.displayName
        } and maximum allowed ${identifier.resourceType ?? identifier.displayName}.`,
      ),
      path: ['defaultCount'],
    });
  }

  // 3. Prevent negative values
  const hasNegative = [
    { value: identifier.minCount, name: 'Minimum count' },
    { value: identifier.maxCount, name: 'Maximum count' },
    { value: identifier.defaultCount, name: 'Default count' },
  ].some(({ value, name }) => checkNegative(name, value));

  if (hasNegative) {
    return;
  }

  try {
    const parseCount = (count: string | number) =>
      splitValueUnit(count.toString(), unitOptions, true)[0];

    const minCount = parseCount(identifier.minCount);
    const maxCount = identifier.maxCount ? parseCount(identifier.maxCount) : undefined;
    const defaultCount = parseCount(identifier.defaultCount);

    // 4. Prevent decimal values
    checkDecimal(minCount, 'Minimum count');
    checkDecimal(defaultCount, 'Default count');
    if (maxCount !== undefined) {
      checkDecimal(maxCount, 'Maximum count');
    }
  } catch (e) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: createIdentifierWarningMessage(
        `The resource count for ${
          identifier.resourceType ?? identifier.displayName
        } has an invalid unit.`,
      ),
      params: { type: HardwareProfileWarningType.OTHER },
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

export const manageHardwareProfileValidationSchema = z
  .object({
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
  })
  .superRefine((data, ctx) => {
    if (!hasCPUandMemory(data.identifiers)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: createIdentifierWarningMessage(
          HARDWARE_PROFILES_MISSING_CPU_MEMORY_MESSAGE,
          false,
        ),
        params: {
          type: HardwareProfileWarningType.HARDWARE_PROFILES_MISSING_CPU_MEMORY,
        },
      });
    }
  });
