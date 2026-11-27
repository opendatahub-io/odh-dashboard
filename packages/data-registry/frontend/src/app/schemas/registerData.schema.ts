import * as z from 'zod';
import { LICENSE_VALUES, MATURITY_VALUES, PII_STATUS_VALUES } from '~/app/types';

const ASSET_NAME_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

const schemaFieldSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  description: z.string(),
  nullable: z.boolean(),
});

const schemaFieldWithValidation = z.object({
  id: z.number(),
  name: z.string().min(1, 'Column name is required'),
  type: z.string().min(1, 'Column type is required'),
  description: z.string(),
  nullable: z.boolean(),
});

const registerDataBaseSchema = z.object({
  assetType: z.enum(['unstructured', 'structured']),
  displayName: z
    .string()
    .trim()
    .min(1, 'Data asset name is required')
    .max(250, 'Data asset name must be 250 characters or fewer'),
  name: z
    .string()
    .trim()
    .min(1, 'Resource name is required')
    .max(30, 'Cannot exceed 30 characters')
    .regex(
      ASSET_NAME_REGEX,
      'Must start and end with a letter or number. Valid characters include lowercase letters, numbers, and hyphens (-).',
    ),
  description: z.string().max(500, 'Description must be 500 characters or fewer'),
  format: z.string(),
  collection: z.string().min(1, 'Collection is required'),
  labels: z.array(z.string()),
  connection: z.string(),
  path: z.string(),
  purpose: z.string().max(200, 'Purpose must be 200 characters or fewer'),
  license: z.union([z.enum(LICENSE_VALUES), z.literal('')]),
  maturity: z.union([z.enum(MATURITY_VALUES), z.literal('')]),
  domain: z.string(),
  piiStatus: z.union([z.enum(PII_STATUS_VALUES), z.literal('')]),
  schemaFields: z.array(schemaFieldSchema),
  customProperties: z.array(z.object({ id: z.number(), key: z.string(), value: z.string() })),
});

export const registerDataSchema = registerDataBaseSchema.superRefine((data, ctx) => {
  if (data.assetType === 'structured') {
    const seenNames = new Set<string>();
    data.schemaFields.forEach((field, index) => {
      const result = schemaFieldWithValidation.safeParse(field);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue({
            ...issue,
            path: ['schemaFields', index, ...issue.path],
          });
        });
      } else {
        if (seenNames.has(field.name)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Column name must be unique',
            path: ['schemaFields', index, 'name'],
          });
        }
        seenNames.add(field.name);
      }
    });
  }
});

export type RegisterDataFormData = z.infer<typeof registerDataSchema>;

export const registerDataDefaults: RegisterDataFormData = {
  assetType: 'structured',
  displayName: '',
  name: '',
  description: '',
  format: 'other',
  collection: '',
  labels: [],
  connection: '',
  path: '/',
  purpose: '',
  license: '',
  maturity: '',
  domain: '',
  piiStatus: '',
  schemaFields: [],
  customProperties: [],
};
