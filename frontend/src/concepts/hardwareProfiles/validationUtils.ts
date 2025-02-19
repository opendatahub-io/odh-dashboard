import { z } from 'zod';
import { HardwareProfileKind } from '~/k8sTypes';
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
import { HardwareProfileConfig } from './useHardwareProfileConfig';
import { HARDWARE_PROFILES_MISSING_CPU_MEMORY_MESSAGE } from './const';
import { HardwareProfileWarningType } from './types';

export enum ValidationErrorCodes {
  LIMIT_BELOW_REQUEST = 'limit_below_request',
}

type ResourceSchema = z.ZodEffects<
  z.ZodUnion<[z.ZodString, z.ZodNumber]>,
  string | number,
  string | number
>;

const createCpuSchema = (minCount: ValueUnitCPU, maxCount: ValueUnitCPU): ResourceSchema =>
  z.union([z.string(), z.number()]).superRefine((val, ctx) => {
    const stringVal = String(val);
    if (isCpuLimitLarger(stringVal, minCount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must be at least ${minCount}`,
      });
    }
    if (isCpuLimitLarger(maxCount, stringVal)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must not exceed ${maxCount}`,
      });
    }
  });

const createMemorySchema = (minCount: ValueUnitString, maxCount: ValueUnitString): ResourceSchema =>
  z.union([z.string(), z.number()]).superRefine((val, ctx) => {
    const stringVal = String(val);

    if (isMemoryLimitLarger(stringVal, minCount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must be at least ${minCount}`,
      });
    }
    if (isMemoryLimitLarger(maxCount, stringVal)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must not exceed ${maxCount}`,
      });
    }
  });

const createNumericSchema = (minCount: number, maxCount: number): ResourceSchema =>
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
        message: `Must be at least ${minCount}`,
      });
    }
    if (value > maxCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must not exceed ${maxCount}`,
      });
    }
  });

export const createHardwareProfileValidationSchema = (
  hardwareProfile?: HardwareProfileKind,
): z.ZodType<HardwareProfileConfig> => {
  const requestsShape: Record<string, ResourceSchema> = {};
  const limitsShape: Record<string, ResourceSchema> = {};

  hardwareProfile?.spec.identifiers?.forEach((identifier) => {
    let schema: ResourceSchema;
    if (identifier.identifier === 'cpu') {
      schema = createCpuSchema(identifier.minCount, identifier.maxCount);
    } else if (identifier.identifier === 'memory') {
      schema = createMemorySchema(String(identifier.minCount), String(identifier.maxCount));
    } else {
      schema = createNumericSchema(Number(identifier.minCount), Number(identifier.maxCount));
    }

    requestsShape[identifier.identifier] = schema;
    limitsShape[identifier.identifier] = schema;
  });

  return z
    .object({
      selectedProfile: z.any(),
      resources: z.object({
        requests: z.object(requestsShape),
        limits: z.object(limitsShape),
      }),
      useExistingSettings: z.boolean(),
    })
    .superRefine((data, ctx) => {
      Object.entries(data.resources.requests).forEach(([identifier, request]) => {
        const limit = data.resources.limits[identifier];
        const isValid =
          identifier === 'cpu'
            ? isCpuLimitLarger(request, limit, true)
            : identifier === 'memory'
            ? isMemoryLimitLarger(String(request), String(limit), true)
            : Number(limit) >= Number(request);

        if (!isValid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            params: { code: ValidationErrorCodes.LIMIT_BELOW_REQUEST },
            path: ['resources', 'limits', identifier],
            message: 'Limit must be greater than or equal to request',
          });
        }
      });
    });
};

export const isHardwareProfileConfigValid = (data: HardwareProfileConfig): boolean => {
  const schema = createHardwareProfileValidationSchema(data.selectedProfile);
  const result = schema.safeParse(data);
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
        maxCount: z.string().or(z.number()),
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
        if (identifier.maxCount.toString().at(0) === '-') {
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
        const [maxCount] = splitValueUnit(
          identifier.maxCount.toString(),
          determineUnit(identifier),
          true,
        );
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
        if (!Number.isInteger(maxCount)) {
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
        if (minCount > maxCount) {
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
        if (defaultCount < minCount || defaultCount > maxCount) {
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
