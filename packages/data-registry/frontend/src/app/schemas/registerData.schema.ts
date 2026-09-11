import * as z from 'zod';

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

export const registerDataSchema = z
  .object({
    assetType: z.enum(['unstructured', 'structured']),
    name: z
      .string()
      .trim()
      .min(1, 'Asset name is required')
      .max(63, 'Name must be 63 characters or fewer')
      .regex(ASSET_NAME_REGEX, 'Name must contain only lowercase letters, numbers, and hyphens'),
    description: z.string().max(500, 'Description must be 500 characters or fewer'),
    format: z.string(),
    collection: z.string().min(1, 'Collection is required'),
    owner: z.string().trim().min(1, 'Owner is required'),
    labels: z.array(z.string()),
    connection: z.string(),
    path: z.string(),
    purpose: z.string().max(200, 'Purpose must be 200 characters or fewer'),
    license: z.string(),
    maturity: z.string(),
    piiStatus: z.string(),
    schemaFields: z.array(schemaFieldSchema),
    customProperties: z.array(z.object({ id: z.number(), key: z.string(), value: z.string() })),
  })
  .superRefine((data, ctx) => {
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
  assetType: 'unstructured',
  name: '',
  description: '',
  format: 'other',
  collection: '',
  owner: '',
  labels: [],
  connection: '',
  path: '/',
  purpose: '',
  license: '',
  maturity: '',
  piiStatus: '',
  schemaFields: [],
  customProperties: [],
};
