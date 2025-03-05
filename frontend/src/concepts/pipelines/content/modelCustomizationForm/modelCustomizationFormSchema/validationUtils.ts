import { z } from 'zod';
import {
  HyperparameterFields,
  RunTypeFormat,
} from '~/pages/pipelines/global/modelCustomization/const';
import { InputDefinitionParameterType } from '~/concepts/pipelines/kfTypes';
import { isEnumMember } from '~/utilities/utils';
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

export const outputModelSchema = z.object({
  outputModelName: z.string().trim().min(1, 'Model name is required'),
  outputModelRegistryApiUrl: z.string().trim().min(1, 'Model registry API URL is required'),
  // TODO more output model fields
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

export const hyperparameterBaseSchema = z.object({
  description: z.string().optional(),
  isOptional: z.boolean(),
  parameterType: z.nativeEnum(InputDefinitionParameterType),
});

export const hyperparameterOptionalSchema = hyperparameterBaseSchema
  .extend({
    defaultValue: z.union([z.number().optional(), z.string().optional(), z.boolean().optional()]),
  })
  .refine(
    (data) => {
      if (!data.isOptional && typeof data.defaultValue === 'undefined') {
        return false;
      }
      return true;
    },
    { message: 'Default value is not optional.' },
  );

export const hyperparameterBooleanSchema = hyperparameterBaseSchema.extend({
  defaultValue: z.boolean(),
});

export const hyperparameterNumericFieldSchema = hyperparameterBaseSchema
  .extend({
    defaultValue: z.number().positive(),
  })
  .superRefine((data, ctx) => {
    if (
      data.parameterType === InputDefinitionParameterType.INTEGER &&
      !Number.isInteger(data.defaultValue)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'The default value must be an integer',
        path: ['isInt'],
      });
    }
    if (!Number.isNaN(data.defaultValue) && data.defaultValue < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        message: 'The default value must be greater than the lower threshold',
        path: ['value'],
        minimum: 0,
        inclusive: false,
        type: 'number',
      });
    }
  });

export const hyperparameterStringSchema = hyperparameterBaseSchema
  .extend({
    defaultValue: z.string(),
  })
  .refine(
    (value) => {
      if (!value.isOptional && value.defaultValue.length === 0) {
        return false;
      }
      return true;
    },
    { message: 'Default value lengh must be greater than 0' },
  );

export const hyperparameterEvaluationFieldSchema = hyperparameterBaseSchema
  .extend({
    defaultValue: z.string(),
  })
  .superRefine((data, ctx) => {
    if (Number.isNaN(Number(data.defaultValue)) && data.defaultValue !== 'auto') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'The default value must be either auto or a positive integer string 1',
        path: ['defaultValue'],
      });
    }
    if (
      !Number.isNaN(Number(data.defaultValue)) &&
      (Number(data.defaultValue) < 1 || !Number.isInteger(Number(data.defaultValue)))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'The default value must be either auto or a positive integer string 2',
        path: ['defaultValue'],
      });
    }
  });

export const hyperparameterFieldSchema = z.record(
  z.nativeEnum(HyperparameterFields),
  z.union([
    hyperparameterNumericFieldSchema,
    hyperparameterEvaluationFieldSchema,
    hyperparameterStringSchema,
    hyperparameterOptionalSchema,
    hyperparameterBooleanSchema,
  ]),
);

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

export type FineTuneTaxonomyFormData = z.infer<typeof fineTuneTaxonomySchema>;

export const modelCustomizationFormSchema = z.object({
  projectName: z.object({ value: z.string().min(1, { message: 'Project is required' }) }),
  taxonomy: fineTuneTaxonomySchema,
  runType: z.object({ value: runTypeSchema }),
  hyperparameters: hyperparameterFieldSchema,
  baseModel: baseModelSchema,
  outputModel: outputModelSchema,
  teacher: teacherJudgeModel,
  judge: teacherJudgeModel,
});

export type ModelCustomizationFormData = z.infer<typeof modelCustomizationFormSchema>;

export type BaseModelFormData = z.infer<typeof baseModelSchema>;
export type OutputModelFormData = z.infer<typeof outputModelSchema>;
export type TeacherJudgeFormData = z.infer<typeof teacherJudgeModel>;
export type HyperparametersFormData = z.infer<typeof hyperparameterFieldSchema>;
