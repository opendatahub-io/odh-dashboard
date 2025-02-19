import { z } from 'zod';
import {
  isCpuLimitLarger,
  isMemoryLimitLarger,
  ValueUnitCPU,
  ValueUnitString,
  determineUnit,
  splitValueUnit,
} from '~/utilities/valueUnits';
import { hasCPUandMemory } from '~/pages/hardwareProfiles/manage/ManageNodeResourceSection';
import { createIdentifierWarningMessage } from '~/pages/hardwareProfiles/utils';
import { IdentifierResourceType } from '~/types';
import { HardwareProfileKind } from '~/k8sTypes';
import { HardwareProfileConfig } from './useHardwareProfileConfig';
import { HARDWARE_PROFILES_MISSING_CPU_MEMORY_MESSAGE } from './const';
import { HardwareProfileWarningType } from './types';
import { formatResourceValue } from './utils';

export enum ValidationErrorCodes {
  LIMIT_BELOW_REQUEST = 'limit_below_request',
}

export type ResourceSchema = z.ZodEffects<
  z.ZodUnion<[z.ZodString, z.ZodNumber]>,
  string | number,
  string | number
>;

export const createCpuSchema = (minCount: ValueUnitCPU, maxCount?: ValueUnitCPU): ResourceSchema =>
  z.union([z.string(), z.number()]).superRefine((val, ctx) => {
    const stringVal = String(val);
    if (isCpuLimitLarger(stringVal, minCount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must be at least ${formatResourceValue(minCount)}`,
      });
    }
    if (maxCount && isCpuLimitLarger(maxCount, stringVal)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must not exceed ${formatResourceValue(maxCount)}`,
      });
    }
  });

export const createMemorySchema = (
  minCount: ValueUnitString,
  maxCount: ValueUnitString,
): ResourceSchema =>
  z.union([z.string(), z.number()]).superRefine((val, ctx) => {
    const stringVal = String(val);

    if (isMemoryLimitLarger(stringVal, minCount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must be at least ${formatResourceValue(minCount)}`,
      });
    }
    if (isMemoryLimitLarger(maxCount, stringVal)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must not exceed ${formatResourceValue(maxCount)}`,
      });
    }
  });

export const createNumericSchema = (minCount: number, maxCount: number): ResourceSchema =>
  z.union([z.string(), z.number()]).superRefine((val, ctx) => {
    const value = Number(val);
    if (Number.isNaN(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Value must be a number',
      });
      return;
    }
    if (value < minCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must be at least ${formatResourceValue(minCount)}`,
      });
    }
    if (value > maxCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must not exceed ${formatResourceValue(maxCount)}`,
      });
    }
  });

export const hardwareProfileValidationSchema = z
  .object({
    selectedProfile: z.custom<HardwareProfileKind>().optional(),
    resources: z.object({
      requests: z.record(z.union([z.string(), z.number(), z.undefined()])),
      limits: z.record(z.union([z.string(), z.number(), z.undefined()])),
    }),
    useExistingSettings: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.selectedProfile?.spec.identifiers) {
      return;
    }

    data.selectedProfile.spec.identifiers.forEach((identifier) => {
      let schema: ResourceSchema;
      if (identifier.identifier === 'cpu') {
        schema = createCpuSchema(identifier.minCount, identifier.maxCount);
      } else if (identifier.identifier === 'memory') {
        schema = createMemorySchema(String(identifier.minCount), String(identifier.maxCount));
      } else {
        schema = createNumericSchema(Number(identifier.minCount), Number(identifier.maxCount));
      }

      const request = data.resources.requests[identifier.identifier];
      const limit = data.resources.limits[identifier.identifier];

      // Validate against the schema
      const requestResult = schema.safeParse(request);
      const limitResult = schema.safeParse(limit);

      if (!requestResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['resources', 'requests', identifier.identifier],
          message: requestResult.error.errors[0].message,
        });
      }

      if (!limitResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['resources', 'limits', identifier.identifier],
          message: limitResult.error.errors[0].message,
        });
      }

      if (requestResult.success && limitResult.success) {
        const isValid =
          identifier.identifier === 'cpu'
            ? isCpuLimitLarger(request, limit, true)
            : identifier.identifier === 'memory'
            ? isMemoryLimitLarger(String(request), String(limit), true)
            : Number(limit) >= Number(request);

        if (!isValid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            params: { code: ValidationErrorCodes.LIMIT_BELOW_REQUEST },
            path: ['resources', 'limits', identifier.identifier],
            message: 'Limit must be greater than or equal to request',
          });
        }
      }
    });
  });

export const isHardwareProfileConfigValid = (data: HardwareProfileConfig): boolean => {
  // if no resources, and not using existing settings, then not valid
  if (!data.useExistingSettings && !data.resources) {
    return false;
  }
  const result = hardwareProfileValidationSchema.safeParse(data);
  return result.success;
};

export const hardwareProfileWarningSchema = z
  .object({
    isDefault: z.boolean(),
    value: z.array(
      z.object({
        displayName: z.string(),
        identifier: z.string(),
        minCount: z.string().or(z.number()),
        maxCount: z.string().or(z.number()).optional(),
        defaultCount: z.string().or(z.number()),
        resourceType: z
          .enum([IdentifierResourceType.CPU, IdentifierResourceType.MEMORY])
          .optional(),
      }),
    ),
  })
  .superRefine((data, ctx) => {
    if (!hasCPUandMemory(data.value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: createIdentifierWarningMessage(
          HARDWARE_PROFILES_MISSING_CPU_MEMORY_MESSAGE,
          data.isDefault,
        ),
        params: {
          type: HardwareProfileWarningType.HARDWARE_PROFILES_MISSING_CPU_MEMORY,
        },
      });
    }
    for (const identifier of data.value) {
      try {
        let isNegative = false;
        if (identifier.minCount.toString().at(0) === '-') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: createIdentifierWarningMessage(
              `Minimum allowed ${
                identifier.resourceType ?? identifier.displayName
              } cannot be negative.`,
              data.isDefault,
            ),
            params: {
              type: HardwareProfileWarningType.OTHER,
            },
          });
          isNegative = true;
        }
        if (identifier.maxCount && identifier.maxCount.toString().at(0) === '-') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: createIdentifierWarningMessage(
              `Maximum allowed ${
                identifier.resourceType ?? identifier.displayName
              } cannot be negative.`,
              data.isDefault,
            ),
            params: {
              type: HardwareProfileWarningType.OTHER,
            },
          });
          isNegative = true;
        }
        if (identifier.defaultCount.toString().at(0) === '-') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: createIdentifierWarningMessage(
              `Default count for ${
                identifier.resourceType ?? identifier.displayName
              } cannot be negative.`,
              data.isDefault,
            ),
            params: {
              type: HardwareProfileWarningType.OTHER,
            },
          });
          isNegative = true;
        }
        if (isNegative) {
          //Exit to prevent errors from splitValueUnit
          continue;
        }
        const [minCount] = splitValueUnit(
          identifier.minCount.toString(),
          determineUnit(identifier),
          true,
        );
        const [maxCount] = identifier.maxCount
          ? splitValueUnit(identifier.maxCount.toString(), determineUnit(identifier), true)
          : [undefined];
        const [defaultCount] = splitValueUnit(
          identifier.defaultCount.toString(),
          determineUnit(identifier),
          true,
        );
        if (!Number.isInteger(minCount)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: createIdentifierWarningMessage(
              `Minimum count for ${
                identifier.resourceType ?? identifier.displayName
              } cannot be a decimal.`,
              data.isDefault,
            ),
            params: {
              type: HardwareProfileWarningType.OTHER,
            },
          });
        }
        if (maxCount !== undefined && !Number.isInteger(maxCount)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: createIdentifierWarningMessage(
              `Maximum count for ${
                identifier.resourceType ?? identifier.displayName
              } cannot be a decimal.`,
              data.isDefault,
            ),
            params: {
              type: HardwareProfileWarningType.OTHER,
            },
          });
        }
        if (!Number.isInteger(defaultCount)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: createIdentifierWarningMessage(
              `Default count for ${
                identifier.resourceType ?? identifier.displayName
              } cannot be a decimal.`,
              data.isDefault,
            ),
            params: {
              type: HardwareProfileWarningType.OTHER,
            },
          });
        }
        if (maxCount !== undefined && minCount > maxCount) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: createIdentifierWarningMessage(
              `Minimum allowed ${
                identifier.resourceType ?? identifier.displayName
              } cannot exceed maximum allowed ${
                identifier.resourceType ?? identifier.displayName
              }.`,
              data.isDefault,
            ),
            params: {
              type: HardwareProfileWarningType.OTHER,
            },
          });
        }
        if (defaultCount < minCount || (maxCount !== undefined && defaultCount > maxCount)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: createIdentifierWarningMessage(
              `The default count for ${
                identifier.resourceType ?? identifier.displayName
              } must be between the minimum allowed ${
                identifier.resourceType ?? identifier.displayName
              } and maximum allowed ${identifier.resourceType ?? identifier.displayName}.`,
              data.isDefault,
            ),
            params: {
              type: HardwareProfileWarningType.OTHER,
            },
          });
        }
      } catch (e) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: createIdentifierWarningMessage(
            `The resource count for ${
              identifier.resourceType ?? identifier.displayName
            } has an invalid unit.`,
            data.isDefault,
          ),
          params: {
            type: HardwareProfileWarningType.OTHER,
          },
        });
      }
    }
  });
