import * as z from 'zod';
import { createSchema } from '../utilities/schema';

function createExperimentSchema(): z.ZodPipe<
  z.ZodObject<
    { name: z.ZodDefault<z.ZodString>; description: z.ZodOptional<z.ZodDefault<z.ZodString>> },
    z.core.$strip
  >,
  z.ZodTransform<
    { name: string; description?: string | undefined },
    { name: string; description?: string | undefined }
  >
> {
  return createSchema({
    // Make sure all fields (including optional ones) have a default to ensure RHF works as intended.
    schema: z.object({
      name: z.string().min(1).default(''),
      description: z.string().default('').optional(),
    }),
    /* eslint-disable no-param-reassign */
    transformers: [
      (data) => {
        if (data.description === '') {
          delete data.description;
        }
        return data;
      },
    ],
    /* eslint-enable no-param-reassign */
  });
}

export type ExperimentSchema = z.infer<typeof createExperimentSchema>;

export { createExperimentSchema };
