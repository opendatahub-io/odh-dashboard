import * as z from 'zod';
import { createSchema } from '../utilities/schema';

const { schema: experimentSchema } = createSchema(
  // Make sure all fields (including optional ones) have a default to ensure RHF works as intended.
  z.object({
    name: z.string().min(1).default(''),
    description: z.string().default('').optional(),
  }),
  [],
  /* eslint-disable no-param-reassign */
  [
    (data) => {
      if (data.description === '') {
        delete data.description;
      }
    },
  ],
  /* eslint-enable no-param-reassign */
);

export type ExperimentSchema = z.infer<typeof experimentSchema>;

export { experimentSchema };
