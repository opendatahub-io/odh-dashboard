import * as z from 'zod';
import { createSchema } from '../utilities/schema';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function createExperimentSchema() {
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
