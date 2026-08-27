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
  customProperties: z.array(z.object({ id: z.number(), key: z.string(), value: z.string() })),
  schemaFields: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      type: z.string(),
      description: z.string(),
      nullable: z.boolean(),
    }),
  ),
});

export type EditAssetFormData = z.infer<typeof editAssetSchema>;
