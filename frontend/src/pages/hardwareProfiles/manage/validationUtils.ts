import { z, ZodEffects } from 'zod';
import { IdentifierResourceType, TolerationEffect, TolerationOperator } from '#~/types';
import {
  validateDefaultCount,
  validateMaxCount,
  validateMinCount,
} from '#~/pages/hardwareProfiles/nodeResource/utils';
import { splitValueUnit } from '#~/utilities/valueUnits';
import { HardwareProfileWarningType } from '#~/concepts/hardwareProfiles/types';
import {
  createIdentifierWarningMessage,
  determineIdentifierUnit,
} from '#~/pages/hardwareProfiles/utils';
import { HARDWARE_PROFILES_MISSING_CPU_MEMORY_MESSAGE } from '#~/concepts/hardwareProfiles/const';
import { hasCPUandMemory } from './ManageNodeResourceSection';

const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

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

  const checkNegative = (fieldName: string, identifierName: string, value?: string | number) => {
    if (value?.toString().startsWith('-')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: createIdentifierWarningMessage(
          `${fieldName} for ${
            identifier.resourceType ?? identifier.displayName
          } cannot be negative.`,
        ),
        params: {
          code: HardwareProfileWarningType.CANNOT_BE_NEGATIVE,
        },
        path: ['identifiers', identifierName, fieldName],
      });
      return true;
    }
    return false;
  };

  const checkDecimal = (value: number, identifierName: string, fieldName: string) => {
    if (!Number.isInteger(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: createIdentifierWarningMessage(
          `${fieldName} for ${
            identifier.resourceType ?? identifier.displayName
          } cannot be a decimal.`,
        ),
        params: {
          code: HardwareProfileWarningType.CANNOT_BE_DECIMAL,
        },
        path: ['identifiers', identifierName, fieldName],
      });
    }
  };

  // 1. Validate minCount is within range
  const minCountValidation = validateMinCount(identifier, unitOptions);
  if (!minCountValidation.isValid) {
    minCountValidation.issues?.forEach((issue) => ctx.addIssue(issue));
  }

  // 2. Validate defaultCount is within range
  const defaultCountValidation = validateDefaultCount(identifier, unitOptions);
  if (!defaultCountValidation.isValid) {
    defaultCountValidation.issues?.forEach((issue) => ctx.addIssue(issue));
  }

  // 3. Validate maxCount is within range
  const maxCountValidation = validateMaxCount(identifier, unitOptions);
  if (!maxCountValidation.isValid) {
    maxCountValidation.issues?.forEach((issue) => ctx.addIssue(issue));
  }

  // 3. Prevent negative values
  const hasNegative = [
    { value: identifier.minCount, identifierName: identifier.identifier, name: 'Minimum count' },
    { value: identifier.maxCount, identifierName: identifier.identifier, name: 'Maximum count' },
    {
      value: identifier.defaultCount,
      identifierName: identifier.identifier,
      name: 'Default count',
    },
  ].some(({ value, identifierName, name }) => checkNegative(name, identifierName, value));

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
    if (minCount !== undefined) {
      checkDecimal(minCount, identifier.identifier, 'Minimum count');
    }
    if (defaultCount !== undefined) {
      checkDecimal(defaultCount, identifier.identifier, 'Default count');
    }
    if (maxCount !== undefined) {
      checkDecimal(maxCount, identifier.identifier, 'Maximum count');
    }
  } catch (e) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: createIdentifierWarningMessage(
        `The resource count for ${
          identifier.resourceType ?? identifier.displayName
        } has an invalid unit.`,
      ),
      params: {
        code: HardwareProfileWarningType.INVALID_UNIT,
      },
      path: ['identifiers', identifier.identifier],
    });
  }
});

export const createHardwareProfileWarningSchema = (
  hardwareProfileName: string,
): ZodEffects<z.ZodArray<typeof identifierSchema>> =>
  z.array(identifierSchema).superRefine((data, ctx) => {
    if (!hasCPUandMemory(data)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: createIdentifierWarningMessage(HARDWARE_PROFILES_MISSING_CPU_MEMORY_MESSAGE),
        params: {
          code: HardwareProfileWarningType.HARDWARE_PROFILES_MISSING_CPU_MEMORY,
        },
        path: ['hardwareProfiles', hardwareProfileName, 'identifiers'],
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
  name: z.string().trim().min(1).max(253).regex(k8sNameRegex),
  description: z.string().optional(),
  visibility: z.array(z.string()),
});
