/* eslint-disable camelcase */
import { z } from 'zod';
import { hardwareProfileValidationSchema } from '#~/concepts/hardwareProfiles/validationUtils';
import { isCpuLimitLarger, isMemoryLimitLarger } from '#~/utilities/valueUnits';
import { AcceleratorProfileFormData } from '#~/utilities/useAcceleratorProfileFormState';
import { EXPECTED_FINE_TUNING_PIPELINE_PARAMETERS } from '#~/pages/pipelines/global/modelCustomization/const';
import { InferenceServiceStorageType } from '#~/pages/modelServing/screens/types';
import { FineTuneTaxonomyType, ModelCustomizationEndpointType } from './types';

export const baseModelSchema = z.object({
  sdgBaseModel: z.string().trim().min(1, 'Base model is required'),
});

export const connectionFormDataScheme = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(InferenceServiceStorageType.EXISTING_STORAGE),
    uri: z.string().optional(),
    connection: z.string().optional(),
  }),
  z.object({
    type: z.literal(InferenceServiceStorageType.NEW_STORAGE),
    uri: z.string().optional(),
  }),
]);

export const outputModelSchema = z.object({
  addToRegistryEnabled: z.boolean(),
  outputModelRegistryName: z.string().optional(),
  outputModelName: z.string().optional(),
  outputModelVersion: z.string().optional(),
  outputModelRegistryApiUrl: z.string().optional(),
  connectionData: connectionFormDataScheme,
});

const teacherJudgeBaseSchema = z.object({
  endpoint: z.string().trim().min(1, 'Endpoint is required'),
  modelName: z.string().trim().min(1, 'Model name is required'),
});
const teacherJudgePublicSchema = teacherJudgeBaseSchema.extend({
  endpointType: z.literal(ModelCustomizationEndpointType.PUBLIC),
  apiToken: z.string().optional(),
});
const teacherJudgePrivateSchema = teacherJudgeBaseSchema.extend({
  endpointType: z.literal(ModelCustomizationEndpointType.PRIVATE),
  apiToken: z.string().trim().min(1, 'Token is required'),
});

export const teacherJudgeModel = z.discriminatedUnion('endpointType', [
  teacherJudgePrivateSchema,
  teacherJudgePublicSchema,
]);

export const fineTuneTaxonomySchema = z.object({
  url: z.string().trim().min(1, 'URL is required'),
  secret: z.discriminatedUnion('type', [
    z.object({
      type: z.literal(FineTuneTaxonomyType.SSH_KEY),
      sshKey: z.string().trim().min(1, 'SSH Key is required'),
      username: z.string().optional(),
      token: z.string().optional(),
    }),
    z.object({
      type: z.literal(FineTuneTaxonomyType.USERNAME_TOKEN),
      username: z.string().trim().min(1, 'Username is required'),
      token: z.string().trim().min(1, 'Token is required'),
      sshKey: z.string().optional(),
    }),
  ]),
});

export const podSpecSizeSchema = z.object({
  cpuCount: z
    .union([z.string(), z.number()])
    .refine((val) => isCpuLimitLarger(0, val), { message: 'CPU count must be greater than 0' }),
  memoryCount: z.string().refine((val) => isMemoryLimitLarger('0', val), {
    message: 'Memory count must be greater than 0',
  }),
});

const hardwareSchema = z.object({
  podSpecOptions: z
    .object({
      gpuCount: z
        .number()
        .refine((val) => val > 0, { message: 'GPU count must be greater than 0' }),
      gpuIdentifier: z.string().trim().min(1, 'GPU identifier cannot be empty'),
      tolerations: z.array(z.any()).optional(),
      nodeSelector: z.record(z.any()).optional(),
    })
    .and(podSpecSizeSchema),
  hardwareProfileConfig: hardwareProfileValidationSchema.optional(),
  acceleratorProfileConfig: z.custom<AcceleratorProfileFormData>().optional(),
});

export type FineTuneTaxonomyFormData = z.infer<typeof fineTuneTaxonomySchema>;

export const pipelineParameterSchema = z.record(z.string(), z.any()).superRefine((params, ctx) => {
  for (const key of EXPECTED_FINE_TUNING_PIPELINE_PARAMETERS) {
    if (!(key in params)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Missing expected parameter ${key}`,
      });
    }
  }
});

export const trainingNodeSchema = z
  .number()
  .refine((val) => val > 0, { message: 'Number must be greater than 0' });

export const storageClassSchema = z
  .string()
  .trim()
  .min(1, { message: 'Storage class is required' });

export const modelCustomizationFormSchema = z.object({
  taxonomy: fineTuneTaxonomySchema,
  hyperparameters: z.record(z.string(), z.any()),
  baseModel: baseModelSchema,
  outputModel: outputModelSchema,
  teacher: teacherJudgeModel,
  judge: teacherJudgeModel,
  trainingNode: trainingNodeSchema,
  storageClass: storageClassSchema,
  hardware: hardwareSchema,
});

export type ModelCustomizationFormData = z.infer<typeof modelCustomizationFormSchema>;
export type BaseModelFormData = z.infer<typeof baseModelSchema>;
export type OutputModelFormData = z.infer<typeof outputModelSchema>;
export type TeacherJudgeFormData = z.infer<typeof teacherJudgeModel>;
export type HardwareFormData = z.infer<typeof hardwareSchema>;
export type ConnectionFormData = z.infer<typeof connectionFormDataScheme>;
