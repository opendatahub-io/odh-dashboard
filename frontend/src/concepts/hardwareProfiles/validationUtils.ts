import { z } from 'zod';
import {
  isCpuLimitLarger,
  isMemoryLimitLarger,
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
  z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodUndefined]>,
  string | number | undefined,
  string | number | undefined
>;

export const createCpuSchema = (minCount: ValueUnitCPU, maxCount?: ValueUnitCPU): ResourceSchema =>
  z.union([z.string(), z.number(), z.undefined()]).superRefine((val, ctx) => {
    if (val === undefined) {
      return;
    }
    const stringVal = String(val);
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
  z.union([z.string(), z.number(), z.undefined()]).superRefine((val, ctx) => {
    if (val === undefined) {
      return;
    }
    const stringVal = String(val);
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
  z.union([z.string(), z.number(), z.undefined()]).superRefine((val, ctx) => {
    if (val === undefined) {
      return;
    }
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
      requests: z.record(z.union([z.string(), z.number(), z.undefined()])).optional(),
      limits: z.record(z.union([z.string(), z.number(), z.undefined()])).optional(),
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

      const request = data.resources.requests?.[identifier.identifier];
      const limit = data.resources.limits?.[identifier.identifier];

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
        const isUndefinedOkay =
          (request !== undefined && limit === undefined) ||
          (request === undefined && limit === undefined);
        const isValid =
          identifier.identifier === 'cpu'
            ? isCpuLimitLarger(request, limit, true, isUndefinedOkay)
            : identifier.identifier === 'memory'
            ? isMemoryLimitLarger(String(request), String(limit), true, isUndefinedOkay)
            : Number(limit) >= Number(request) || isUndefinedOkay;

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
  const result = hardwareProfileValidationSchema.safeParse(data);
  return result.success;
};
