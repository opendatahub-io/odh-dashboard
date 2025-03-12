/* eslint-disable camelcase */
import { z } from 'zod';
import { hardwareProfileValidationSchema } from '~/concepts/hardwareProfiles/validationUtils';
import { isCpuLimitLarger, isMemoryLimitLarger } from '~/utilities/valueUnits';
import { AcceleratorProfileFormData } from '~/utilities/useAcceleratorProfileFormState';
import { InputDefinitionParameterType } from '~/concepts/pipelines/kfTypes';
import { isEnumMember } from '~/utilities/utils';
import {
  NonDisplayedHyperparameterFields,
  PipelineInputParameters,
  RunTypeFormat,
} from '~/pages/pipelines/global/modelCustomization/const';
import { InferenceServiceStorageType } from '~/pages/modelServing/screens/types';
import { FineTuneTaxonomyType, ModelCustomizationEndpointType } from './types';

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
  sdgBaseModel: uriFieldSchemaBase(true),
});

export const connectionFormDataScheme = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(InferenceServiceStorageType.EXISTING_STORAGE),
    uri: uriFieldSchemaBase(true).optional(),
    connection: z.string().optional(),
  }),
  z.object({
    type: z.literal(InferenceServiceStorageType.NEW_STORAGE),
    uri: uriFieldSchemaBase(true).optional(),
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

export const runTypeSchema = z.string().refine(
  (value) => {
    if (!isEnumMember(value, RunTypeFormat)) {
      return false;
    }
    return true;
  },
  { message: 'Invalid Run Type' },
);

export const fineTunedModelDetailsSchema = z.object({
  registry: z.string(),
  versionName: z.string().min(1, 'Version name is required'),
  modelStorageLocation: z.string(),
});

export const fineTuneTaxonomySchema = z.object({
  url: z
    .string()
    .url()
    .refine((url) => url.endsWith('.git'), {
      message: 'Invalid Git URL',
    }),
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

const hardwareSchema = z.object({
  podSpecOptions: z.object({
    cpuCount: z
      .union([z.string(), z.number()])
      .refine((val) => isCpuLimitLarger(0, val), { message: 'CPU count must be greater than 0' }),
    memoryCount: z.string().refine((val) => isMemoryLimitLarger('0', val), {
      message: 'Memory count must be greater than 0',
    }),
    gpuCount: z.number().refine((val) => val > 0, { message: 'GPU count must be greater than 0' }),
    gpuIdentifier: z.string().trim().min(1, 'GPU identifier cannot be empty'),
    tolerations: z.array(z.any()).optional(),
    nodeSelector: z.record(z.any()).optional(),
  }),
  hardwareProfileConfig: hardwareProfileValidationSchema.optional(),
  acceleratorProfileConfig: z.custom<AcceleratorProfileFormData>().optional(),
});

export type FineTuneTaxonomyFormData = z.infer<typeof fineTuneTaxonomySchema>;
const parameterSchema = z.object({
  defaultValue: z
    .union([
      z.string(),
      z.number(),
      z.boolean(),
      z.object({}),
      z.array(z.object({})),
      z.undefined(),
    ])
    .optional(),
  description: z.string().optional(),
  isOptional: z.boolean().optional(),
  parameterType: z.enum([
    InputDefinitionParameterType.DOUBLE,
    InputDefinitionParameterType.INTEGER,
    InputDefinitionParameterType.BOOLEAN,
    InputDefinitionParameterType.STRING,
    InputDefinitionParameterType.LIST,
    InputDefinitionParameterType.STRUCT,
  ]),
});

export type PipelineParametersType = z.infer<typeof pipelineParameterSchema>;

const expectedParams = {
  [NonDisplayedHyperparameterFields.SDG_SECRET_URL]: InputDefinitionParameterType.STRING,
  [NonDisplayedHyperparameterFields.SDG_REPO_SECRET]: InputDefinitionParameterType.STRING,
  [NonDisplayedHyperparameterFields.SDG_TEACHER_SECRET]: InputDefinitionParameterType.STRING,
  [NonDisplayedHyperparameterFields.SDG_BASE_MODEL]: InputDefinitionParameterType.STRING,
  [NonDisplayedHyperparameterFields.SDG_PIPELINE]: InputDefinitionParameterType.STRING,
  [NonDisplayedHyperparameterFields.TRAIN_GPU_IDENTIFIER]: InputDefinitionParameterType.STRING,
  [NonDisplayedHyperparameterFields.TRAIN_GPU_PER_WORKER]: InputDefinitionParameterType.INTEGER,
  [NonDisplayedHyperparameterFields.TRAIN_CPU_PER_WORKER]: InputDefinitionParameterType.STRING,
  [NonDisplayedHyperparameterFields.TRAIN_MEMORY_PER_WORKER]: InputDefinitionParameterType.STRING,
  [NonDisplayedHyperparameterFields.EVAL_GPU_IDENTIFIER]: InputDefinitionParameterType.STRING,
  [NonDisplayedHyperparameterFields.EVAL_JUDGE_SECRET]: InputDefinitionParameterType.STRING,
  [PipelineInputParameters.K8S_STORAGE_CLASS_NAME]: InputDefinitionParameterType.STRING,
} as const;

export const pipelineParameterSchema = z
  .record(z.string(), parameterSchema)
  .superRefine((params, ctx) => {
    for (const [key, expectedType] of Object.entries(expectedParams)) {
      if (!(key in params)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing required parameter ${key}`,
        });

        continue;
      }

      if (params[key].parameterType !== expectedType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Parameter ${key} should be of type ${expectedType}`,
        });
      }
    }
  });

export const modelCustomizationFormSchema = z.object({
  projectName: z.object({ value: z.string().min(1, { message: 'Project is required' }) }),
  taxonomy: fineTuneTaxonomySchema,
  runType: z.object({ value: runTypeSchema }),
  hyperparameters: z.record(z.string(), z.any()),
  baseModel: baseModelSchema,
  outputModel: outputModelSchema,
  teacher: teacherJudgeModel,
  judge: teacherJudgeModel,
  inputPipelineParameters: pipelineParameterSchema,
  trainingNode: z.number().refine((val) => val > 0, { message: 'Number must be greater than 0' }),
  storageClass: z.string().trim().min(1, { message: 'storage class is required' }),
  hardware: hardwareSchema,
});

export type ModelCustomizationFormData = z.infer<typeof modelCustomizationFormSchema>;
export type BaseModelFormData = z.infer<typeof baseModelSchema>;
export type OutputModelFormData = z.infer<typeof outputModelSchema>;
export type TeacherJudgeFormData = z.infer<typeof teacherJudgeModel>;
export type HardwareFormData = z.infer<typeof hardwareSchema>;
export type ConnectionFormData = z.infer<typeof connectionFormDataScheme>;
