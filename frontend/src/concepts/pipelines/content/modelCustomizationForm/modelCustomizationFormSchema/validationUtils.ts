import { z } from 'zod';
import { IlabPodSpecOptions } from '~/pages/pipelines/global/modelCustomization/useIlabPodSpecOptionsState';
import { HardwareProfileKind } from '~/k8sTypes';
import {
  createCpuSchema,
  createMemorySchema,
  createNumericSchema,
  ResourceSchema,
} from '~/concepts/hardwareProfiles/validationUtils';
import { HardwareProfileConfig } from '~/concepts/hardwareProfiles/useHardwareProfileConfig';
import {
  FineTuneTaxonomyType,
  ModelCustomizationEndpointType,
  ModelCustomizationRunType,
} from './types';

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

export const createIlabHardwareProfileValidationSchema = (
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

  return z.object({
    selectedProfile: z.any(),
    resources: z.object({
      requests: z.object(requestsShape),
    }),
  });
};

export const isIlabHardwareProfileConfigValid = (data: HardwareProfileConfig): boolean => {
  const schema = createIlabHardwareProfileValidationSchema(data.selectedProfile);
  const result = schema.safeParse(data);
  return result.success;
};

export const createAcceleratorResourcesSchema: z.ZodType<IlabPodSpecOptions> = z.object({
  selectedAcceleratorProfile: z.any(),
  selectedHardwareProfile: z.any(),
  tolerations: z.any(),
  nodeSelector: z.record(z.string()).optional(),
  resources: z
    .object({
      requests: z
        .object({
          cpu: z
            .union([z.string(), z.number()])
            .optional()
            .refine(
              (val) => {
                if (val && typeof val === 'number') {
                  return val > 0;
                }
                if (val && typeof val === 'string') {
                  return parseFloat(val) > 0;
                }
                return false;
              },
              { message: 'CPU must be greater than 0' },
            ),

          memory: z
            .string()
            .optional()
            .refine(
              (val) => {
                if (val) {
                  const memoryValue = parseFloat(val);
                  return memoryValue > 0;
                }
                return false;
              },
              { message: 'Memory must be greater than 0' },
            ),
        })
        .catchall(z.union([z.string(), z.number()]).optional())
        .optional(),
    })
    .superRefine((data, ctx) => {
      const keys = Object.keys(data.requests ?? {});

      const otherKeys = keys.filter((key) => key !== 'cpu' && key !== 'memory');

      if (otherKeys.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `must contain a extra key`,
        });
      }
    }),
});

export const isAcceleratorConfigValid = (podSpecOptions: IlabPodSpecOptions): boolean => {
  if (!podSpecOptions.selectedAcceleratorProfile) {
    return false;
  }
  const result = createAcceleratorResourcesSchema.safeParse(podSpecOptions);
  return result.success;
};

export const runTypeSchema = z.enum([
  ModelCustomizationRunType.FULL_RUN,
  ModelCustomizationRunType.SIMPLE_RUN,
]);

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
  baseModel: baseModelSchema,
  outputModel: outputModelSchema,
  teacher: teacherJudgeModel,
  judge: teacherJudgeModel,
  trainingNode: z.number().refine((val) => val > 0, { message: 'Number must be greater than 0' }),
  storageClass: z.string().trim().min(1, { message: 'storage class is required' }),
});

export type ModelCustomizationFormData = z.infer<typeof modelCustomizationFormSchema>;

export type BaseModelFormData = z.infer<typeof baseModelSchema>;
export type OutputModelFormData = z.infer<typeof outputModelSchema>;
export type TeacherJudgeFormData = z.infer<typeof teacherJudgeModel>;
