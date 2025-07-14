import { z } from 'zod';
import {
  CPU_UNITS,
  isCpuLimitLarger,
  isMemoryLimitLarger,
  MEMORY_UNITS_FOR_PARSING,
  splitValueUnit,
} from '#~/utilities/valueUnits.ts';

const resourceSchema = z
  .object({
    cpu: z.union([z.string(), z.number()]).optional(),
    memory: z.string().optional(),
  })
  .catchall(z.union([z.string(), z.number()]).optional())
  .superRefine((data, ctx) => {
    if (data.cpu !== undefined) {
      const cpuValue = splitValueUnit(String(data.cpu), CPU_UNITS)[0];
      if (cpuValue === undefined) {
        ctx.addIssue({
          path: ['cpu'],
          code: z.ZodIssueCode.custom,
          message: 'Invalid CPU count',
        });
      }
    }
    if (data.memory !== undefined) {
      const memoryValue = splitValueUnit(String(data.memory), MEMORY_UNITS_FOR_PARSING)[0];
      if (memoryValue === undefined) {
        ctx.addIssue({
          path: ['memory'],
          code: z.ZodIssueCode.custom,
          message: 'Invalid memory count',
        });
      }
    }
  });

export const containerResourcesSchema = z
  .object({
    requests: resourceSchema.optional(),
    limits: resourceSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.requests?.cpu &&
      data.limits?.cpu &&
      !isCpuLimitLarger(data.requests.cpu, data.limits.cpu, true)
    ) {
      ctx.addIssue({
        path: ['requests', 'cpu'],
        code: z.ZodIssueCode.custom,
        message: 'CPU requested must be less than or equal to CPU limit',
      });
      ctx.addIssue({
        path: ['limits', 'cpu'],
        code: z.ZodIssueCode.custom,
        message: 'CPU limit must be greater than or equal to CPU requested',
      });
    }
    if (
      data.requests?.memory &&
      data.limits?.memory &&
      !isMemoryLimitLarger(data.requests.memory, data.limits.memory, true)
    ) {
      ctx.addIssue({
        path: ['requests', 'memory'],
        code: z.ZodIssueCode.custom,
        message: 'Memory requested must be less than or equal to memory limit',
      });
      ctx.addIssue({
        path: ['limits', 'memory'],
        code: z.ZodIssueCode.custom,
        message: 'Memory limit must be greater than or equal to memory requested',
      });
    }
  });

export const modelServingSizeSchema = z.object({
  name: z.string(),
  resources: containerResourcesSchema,
});

export type ModelServingSize = z.infer<typeof modelServingSizeSchema>;
