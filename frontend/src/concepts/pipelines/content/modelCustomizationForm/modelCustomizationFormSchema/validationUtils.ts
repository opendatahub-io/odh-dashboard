import { z } from 'zod';
import { ModelCustomizationEndpointType, ModelCustomizationRunType } from './types';

export const uriFieldSchemaBase = (
  isOptional: boolean,
): z.ZodEffects<z.ZodString, string, string> =>
  z.string().refine(
    (value) => {
      if (!value) {
        return !!isOptional;
      }
      try {
        return !!new URL(value);
      } catch (e) {
        return false;
      }
    },
    { message: 'Invalid URI' },
  );

export const baseModelSchema = z.object({
  registryName: z.string(),
  name: z.string(),
  version: z.string(),
  inputStorageLocationUri: uriFieldSchemaBase(true),
});

const teacherJudgeBaseSchema = z.object({
  endpoint: uriFieldSchemaBase(false),
  modelName: z.string().trim().min(1, 'Model name is required'),
});
const teacherJudgePublicSchema = teacherJudgeBaseSchema.extend({
  endpointType: z.literal(ModelCustomizationEndpointType.PUBLIC),
  apiToken: z.string(),
});
const teacherJudgePrivateSchema = teacherJudgeBaseSchema.extend({
  endpointType: z.literal(ModelCustomizationEndpointType.PRIVATE),
  apiToken: z.string().trim().min(1, 'Token is required'),
});

export const teacherJudgeModel = z.discriminatedUnion('endpointType', [
  teacherJudgePrivateSchema,
  teacherJudgePublicSchema,
]);

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
  baseModel: baseModelSchema,
  teacher: teacherJudgeModel,
  judge: teacherJudgeModel,
});

export type ModelCustomizationFormData = z.infer<typeof modelCustomizationFormSchema>;

export type BaseModelFormData = z.infer<typeof baseModelSchema>;
export type TeacherJudgeFormData = z.infer<typeof teacherJudgeModel>;
