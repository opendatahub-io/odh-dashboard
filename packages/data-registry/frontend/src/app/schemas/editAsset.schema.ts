import * as z from 'zod';

export const editAssetSchema = z.object({
  assetType: z.enum(['unstructured', 'structured']),
  name: z.string(),
  description: z.string().max(500, 'Description must be 500 characters or fewer'),
  format: z.string(),
  collection: z.string(),
  labels: z.array(z.string()),
  connection: z.string(),
  path: z.string(),
  purpose: z.string().max(200, 'Purpose must be 200 characters or fewer'),
  license: z.string(),
  maturity: z.string(),
  piiStatus: z.string(),
  customProperties: z
    .array(z.object({ id: z.number(), key: z.string(), value: z.string() }))
    .superRefine((properties, ctx) => {
      const keys = new Set<string>();
      properties.forEach((property, index) => {
        if (property.key && keys.has(property.key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate property key: ${property.key}`,
            path: [index, 'key'],
          });
        }
        if (property.key) {
          keys.add(property.key);
        }
      });
    }),
  schemaFields: z.array(
    z.object({
      id: z.number(),
      name: z.string().trim().min(1, 'Column name is required'),
      type: z.string().trim().min(1, 'Column type is required'),
      description: z.string(),
      nullable: z.boolean(),
    }),
  ),
});

export type EditAssetFormData = z.infer<typeof editAssetSchema>;
