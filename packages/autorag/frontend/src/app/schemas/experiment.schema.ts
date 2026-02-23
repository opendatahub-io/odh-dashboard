import * as z from 'zod';

// Make sure every field has a default to ensure RHF works as intended.
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function createExperimentSchema() {
  return z
    .object({
      name: z.string().min(1).default(''),
      description: z.string().default('').optional(),
    })
    .superRefine((data, { addIssue }) => {
      for (const validate of VALIDATORS) {
        for (const issue of validate(data)) {
          addIssue(issue);
        }
      }
    })
    .transform((data) => {
      for (const transform of TRANSFORMERS) {
        transform(data);
      }
      return data;
    });
}

export type ExperimentSchema = z.infer<ReturnType<typeof createExperimentSchema>>;

type Validator = (data: ExperimentSchema) => z.core.$ZodRawIssue[];
type Transformer = (data: ExperimentSchema) => void;

const VALIDATORS: Array<Validator> = [];

/* eslint-disable no-param-reassign */
const TRANSFORMERS: Array<Transformer> = [
  (data) => {
    if (data.description === '') {
      delete data.description;
    }
  },
];
/* eslint-enable no-param-reassign */

export default createExperimentSchema;
