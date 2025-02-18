import { z } from 'zod';
import { HardwareProfileKind } from '~/k8sTypes';
import {
  isCpuLimitLarger,
  isMemoryLimitLarger,
  ValueUnitCPU,
  ValueUnitString,
} from '~/utilities/valueUnits';
import { HardwareProfileConfig } from './useHardwareProfileConfig';

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
