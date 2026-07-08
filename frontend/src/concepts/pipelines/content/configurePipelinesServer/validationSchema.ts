import { z } from 'zod';
import { PIPELINE_AWS_FIELDS } from '#~/pages/projects/dataConnections/const';
import { DATABASE_CONNECTION_FIELDS } from './const';
import { PipelineServerConfigType } from './types';

const envEntryArray = z.array(z.object({ key: z.string(), value: z.string() }));

const requiredDbKeys = DATABASE_CONNECTION_FIELDS.filter((f) => f.isRequired).map((f) => f.key);
const requiredS3Keys = PIPELINE_AWS_FIELDS.filter((f) => f.isRequired).map((f) => f.key);

const hasRequiredEntries = (
  entries: { key: string; value: string }[],
  requiredKeys: string[],
  trim = false,
): boolean =>
  entries.every(({ key, value }) => {
    if (!requiredKeys.includes(key)) {
      return true;
    }
    const v = trim ? value.trim() : value;
    return !!v;
  });

export const pipelineServerConfigBaseSchema = z
  .object({
    database: z.object({
      useDefault: z.boolean(),
      value: envEntryArray,
    }),
    objectStorage: z.object({
      newValue: envEntryArray,
    }),
    storeYamlInKubernetes: z.boolean(),
    enableCaching: z.boolean(),
    enableManagedPipelines: z.boolean(),
  })
  .refine((c) => c.database.useDefault || hasRequiredEntries(c.database.value, requiredDbKeys), {
    message: 'All required database fields must be filled',
  })
  .refine((c) => hasRequiredEntries(c.objectStorage.newValue, requiredS3Keys, true), {
    message: 'All required object storage fields must be filled',
  });

/** Check whether a schema requires enableManagedPipelines to be true. */
export const schemaRequiresManagedPipelines = (
  schema: z.ZodType<PipelineServerConfigType>,
): boolean => {
  const probe: PipelineServerConfigType = {
    database: { useDefault: true, value: [] },
    objectStorage: {
      newValue: requiredS3Keys.map((key) => ({ key, value: 'x' })),
    },
    storeYamlInKubernetes: true,
    enableCaching: true,
    enableManagedPipelines: false,
  };
  return (
    !schema.safeParse(probe).success &&
    schema.safeParse({ ...probe, enableManagedPipelines: true }).success
  );
};

export const pipelineServerConfigManagedRequiredSchema = pipelineServerConfigBaseSchema.refine(
  (c) => c.enableManagedPipelines,
  {
    message: 'Managed pipelines must be enabled',
  },
);
