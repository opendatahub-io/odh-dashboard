import { z } from 'zod';
import { ModelCustomizationEndpointType, ModelCustomizationRunType } from './types';

export const modelRegistrySchema = z.object({
  properties: z.object({
    modelRegistryName: z.string(),
    modelName: z.string(),
    modelVersion: z.string(),
  }),
});

export const uriFieldSchema = z.object({
  value: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) {
          return true;
        }
        try {
          return !!new URL(value);
        } catch (e) {
          return false;
        }
      },
      { message: 'Invalid URI' },
    ),
});

export const teacherJudgeModel = z.object({
  endpointType: z.enum([
    ModelCustomizationEndpointType.PUBLIC,
    ModelCustomizationEndpointType.PRIVATE,
  ]),
  endpoint: uriFieldSchema,
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const numericFieldSchema = z
  .object({
    value: z.number().optional(),
    unit: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.min != null && data.max != null && data.min >= data.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        message: 'The lower threshold must be less than the upper threshold',
        path: ['min'],
        maximum: data.max,
        inclusive: false,
        type: 'number',
      });
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        message: 'The upper threshold must be greater than the lower threshold',
        path: ['max'],
        minimum: data.min,
        inclusive: false,
        type: 'number',
      });
    }
    if (
      data.value != null &&
      data.min != null &&
      !Number.isNaN(data.value) &&
      !Number.isNaN(data.min) &&
      data.value < data.min
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        message: 'The default value must be greater than the lower threshold',
        path: ['value'],
        minimum: data.min,
        inclusive: false,
        type: 'number',
      });
    }
    if (
      data.value != null &&
      data.max != null &&
      !Number.isNaN(data.value) &&
      !Number.isNaN(data.max) &&
      data.value > data.max
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        message: 'The default value must be less than the upper threshold',
        path: ['value'],
        maximum: data.max,
        inclusive: false,
        type: 'number',
      });
    }
  });

export const trainingHardwareFormSchema = z.object({
  hardwareProfile: z.object({
    value: z.string().min(1, 'Hardware profile is required'),
  }),
  accelerators: numericFieldSchema,
});

export const runTypeSchema = z.enum([
  ModelCustomizationRunType.FULL_RUN,
  ModelCustomizationRunType.SIMPLE_RUN,
]);

export const fineTunedModelDetailsSchema = z.object({
  registry: z.string(),
  versionName: z.string().min(1, 'Version name is required'),
  modelStorageLocation: z.string(),
});

export const modelCustomizationFormSchema = z.object({
  projectName: z.object({ value: z.string().min(1, { message: 'Project is required' }) }),
});
