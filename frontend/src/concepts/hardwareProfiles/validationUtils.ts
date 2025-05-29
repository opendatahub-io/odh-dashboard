import { z } from 'zod';
import {
  CPU_UNITS,
  isCpuLimitLarger,
  isMemoryLimitLarger,
  MEMORY_UNITS_FOR_PARSING,
  splitValueUnit,
  ValueUnitCPU,
  ValueUnitString,
} from '#~/utilities/valueUnits';
import { HardwareProfileKind } from '#~/k8sTypes';
import { IdentifierResourceType } from '#~/types';
import { HardwareProfileConfig } from './useHardwareProfileConfig';
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
    const [value] = splitValueUnit(stringVal, CPU_UNITS);
    if (value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `CPU must be provided`,
      });
    }
    if (isCpuLimitLarger(stringVal, minCount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must be at least ${formatResourceValue(minCount, IdentifierResourceType.CPU)}`,
      });
    }
    if (maxCount && isCpuLimitLarger(maxCount, stringVal)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must not exceed ${formatResourceValue(maxCount, IdentifierResourceType.CPU)}`,
      });
    }
  });

export const createMemorySchema = (
  minCount: ValueUnitString,
  maxCount: ValueUnitString,
): ResourceSchema =>
  z.union([z.string(), z.number()]).superRefine((val, ctx) => {
    const stringVal = String(val);
    const [value] = splitValueUnit(stringVal, MEMORY_UNITS_FOR_PARSING);
    if (value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Memory must be provided`,
      });
    }
    if (isMemoryLimitLarger(stringVal, minCount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must be at least ${formatResourceValue(minCount, IdentifierResourceType.MEMORY)}`,
      });
    }
    if (isMemoryLimitLarger(maxCount, stringVal)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must not exceed ${formatResourceValue(maxCount, IdentifierResourceType.MEMORY)}`,
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
        message: `Must be at least ${formatResourceValue(
          minCount,
          IdentifierResourceType.ACCELERATOR,
        )}`,
      });
    }
    if (value > maxCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must not exceed ${formatResourceValue(
          maxCount,
          IdentifierResourceType.ACCELERATOR,
        )}`,
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
