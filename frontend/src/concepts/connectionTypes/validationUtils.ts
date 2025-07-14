import { uniq } from 'lodash-es';
import { z } from 'zod';
import {
  EXTENSION_REGEX,
  isDuplicateExtension,
} from '#~/concepts/connectionTypes/fields/fieldUtils';
import { ConnectionTypeFieldType } from '#~/concepts/connectionTypes/types';
import { isConnectionTypeDataField } from '#~/concepts/connectionTypes/utils';

const baseFieldSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().optional(),
});

const baseFieldPropertiesSchema = z.object({
  defaultReadOnly: z.boolean().optional(),
});

const baseDataFieldPropertiesSchema = baseFieldSchema.extend({
  envVar: z.string(),
  required: z.boolean().optional(),
});

export const sectionFieldSchema = baseFieldSchema.extend({
  type: z.literal(ConnectionTypeFieldType.Section),
});

export const shortTextFieldSchema = baseDataFieldPropertiesSchema.merge(
  z.object({
    type: z.literal(ConnectionTypeFieldType.ShortText),
    properties: baseFieldPropertiesSchema.extend({ defaultValue: z.string().optional() }),
  }),
);

export const textFieldSchema = baseDataFieldPropertiesSchema.extend({
  type: z.literal(ConnectionTypeFieldType.Text),
  properties: baseFieldPropertiesSchema.extend({ defaultValue: z.string().optional() }),
});

export const hiddenFieldSchema = baseDataFieldPropertiesSchema.extend({
  type: z.literal(ConnectionTypeFieldType.Hidden),
  properties: baseFieldPropertiesSchema.extend({ defaultValue: z.string().optional() }),
});

export const uriFieldSchema = baseDataFieldPropertiesSchema.extend({
  type: z.literal(ConnectionTypeFieldType.URI),
  properties: baseFieldPropertiesSchema.extend({
    defaultValue: z
      .string()
      .optional()
      .refine(
        (defaultValue) => {
          if (!defaultValue) {
            return true;
          }

          try {
            return !!new URL(defaultValue);
          } catch (e) {
            return false;
          }
        },
        { message: 'Invalid URI' },
      ),
  }),
});

export const booleanFieldSchema = baseDataFieldPropertiesSchema.extend({
  type: z.literal(ConnectionTypeFieldType.Boolean),
  properties: baseFieldPropertiesSchema.extend({
    label: z
      .string({ message: 'Checkbox label is required' })
      .min(1, { message: 'Checkbox label is required' }),
    defaultValue: z.boolean().optional(),
  }),
});

export const numericFieldSchema = baseDataFieldPropertiesSchema.extend({
  type: z.literal(ConnectionTypeFieldType.Numeric),
  properties: baseFieldPropertiesSchema
    .extend({
      defaultValue: z.number().optional(),
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
        data.defaultValue != null &&
        data.min != null &&
        !Number.isNaN(data.defaultValue) &&
        !Number.isNaN(data.min) &&
        data.defaultValue < data.min
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          message: 'The default value must be greater than the lower threshold',
          path: ['defaultValue'],
          minimum: data.min,
          inclusive: false,
          type: 'number',
        });
      }
      if (
        data.defaultValue != null &&
        data.max != null &&
        !Number.isNaN(data.defaultValue) &&
        !Number.isNaN(data.max) &&
        data.defaultValue > data.max
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_big,
          message: 'The default value must be less than the upper threshold',
          path: ['defaultValue'],
          maximum: data.max,
          inclusive: false,
          type: 'number',
        });
      }
    }),
});

export const fileFieldSchema = baseDataFieldPropertiesSchema.extend({
  type: z.literal(ConnectionTypeFieldType.File),
  properties: baseFieldPropertiesSchema.extend({
    extensions: z
      .array(
        z.string().regex(EXTENSION_REGEX, {
          message: `A valid extension must start with '.'`,
        }),
      )
      .superRefine((exts, ctx) => {
        exts.forEach((_, i) => {
          if (i > 0 && isDuplicateExtension(i, exts)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              params: { code: ValidationErrorCodes.DUPLICATE },
              path: [i],
              message: 'Extension has already been specified.',
            });
          }
        });
      })
      .optional(),
    defaultValue: z.string().optional(),
  }),
});

export const dropdownFieldSchema = baseDataFieldPropertiesSchema.extend({
  type: z.literal(ConnectionTypeFieldType.Dropdown),
  properties: baseFieldPropertiesSchema.extend({
    variant: z.union([z.literal('single'), z.literal('multi')]).optional(),
    items: z
      .array(
        z.object({
          label: z.string(),
          value: z.string().min(1, { message: 'Value is required' }),
        }),
      )
      .nonempty({ message: 'At least one item is required' })
      .superRefine((items, ctx) => {
        items.forEach((item, i) => {
          if (
            i > 0 &&
            items
              .slice(0, i)
              .some(
                (val) =>
                  item.label && val.label && item.label.toLowerCase() === val.label.toLowerCase(),
              )
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              params: { code: ValidationErrorCodes.DUPLICATE },
              path: [i, 'label'],
              message: `${item.label} already exists.`,
            });
          }
          if (
            i > 0 &&
            items.slice(0, i).some((val) => item.value.toLowerCase() === val.value.toLowerCase())
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              params: { code: ValidationErrorCodes.DUPLICATE },
              path: [i, 'value'],
              message: `${item.value} already exists.`,
            });
          }
        });
      }),
    defaultValue: z.array(z.string()).optional(),
  }),
});

export const dataFieldSchema = z.discriminatedUnion('type', [
  shortTextFieldSchema,
  textFieldSchema,
  hiddenFieldSchema,
  uriFieldSchema,
  booleanFieldSchema,
  numericFieldSchema,
  fileFieldSchema,
  dropdownFieldSchema,
]);

export const fieldSchema = z.discriminatedUnion('type', [
  sectionFieldSchema,
  shortTextFieldSchema,
  textFieldSchema,
  hiddenFieldSchema,
  uriFieldSchema,
  booleanFieldSchema,
  numericFieldSchema,
  fileFieldSchema,
  dropdownFieldSchema,
]);

export const fieldArraySchema = z.array(fieldSchema).superRefine((fields, ctx) => {
  const envVars = fields.map((f) => (isConnectionTypeDataField(f) ? f.envVar : null));

  if (uniq(envVars.filter((e) => e != null)).length !== envVars.filter((e) => e != null).length) {
    ctx.addIssue({
      params: {
        code: ValidationErrorCodes.FIELDS_ENV_VAR_CONFLICT,
      },
      code: z.ZodIssueCode.custom,
      message:
        'Two or more fields are using the same environment variable. Ensure that each field uses a unique environment variable to proceed.',
      path: [],
    });

    envVars.forEach((envVar, i) => {
      if (
        envVar != null &&
        envVars.some(
          (cmp, j) => i !== j && cmp != null && envVar.toLowerCase() === cmp.toLowerCase(),
        )
      ) {
        ctx.addIssue({
          params: {
            code: ValidationErrorCodes.ENV_VAR_CONFLICT,
          },
          code: z.ZodIssueCode.custom,
          message: `${envVar} already exists within this connection type.`,
          path: [i, 'envVar'],
        });
      }
    });
  }
});

export enum ValidationErrorCodes {
  FIELDS_ENV_VAR_CONFLICT = 'fields_envVar_conflict',
  ENV_VAR_CONFLICT = 'envVar_conflict',
  DUPLICATE = 'duplicate',
}

export const connectionTypeFormSchema = z.object({
  enabled: z.boolean(),
  fields: fieldArraySchema,
  username: z.string().min(1, { message: 'Username is required' }),
  category: z
    .array(z.string().min(1, { message: 'Category is required' }))
    .min(1, { message: 'At least one category is required' }),
});
