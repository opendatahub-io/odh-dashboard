import * as z from 'zod';

const COLLECTION_NAME_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

export const registerVolumeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Asset name is required')
    .max(63, 'Name must be 63 characters or fewer')
    .regex(COLLECTION_NAME_REGEX, 'Name must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500, 'Description must be 500 characters or fewer'),
  format: z.string(),
  collection: z.string().min(1, 'Collection is required'),
  labels: z.array(z.string()),
  connection: z.string(),
  path: z.string(),
  purpose: z.string().max(200, 'Purpose must be 200 characters or fewer'),
  license: z.string(),
  maturity: z.string(),
  piiStatus: z.string(),
  customProperties: z.array(z.object({ id: z.number(), key: z.string(), value: z.string() })),
});

export type RegisterVolumeFormData = z.infer<typeof registerVolumeSchema>;

export const registerVolumeDefaults: RegisterVolumeFormData = {
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
  piiStatus: '',
  customProperties: [],
};
