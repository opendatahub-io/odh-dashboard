import { flow } from 'es-toolkit';
import * as z from 'zod';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createSchema<Schema extends z.ZodObject>(options: {
  schema: Schema;
  validators?: Array<(data: z.infer<Schema>) => Array<z.core.$ZodRawIssue>>;
  transformers?: Array<(data: z.infer<Schema>) => z.infer<Schema>>;
}) {
  const { schema, validators = [], transformers = [] } = options;

  const base = schema;
  const full = schema
    .superRefine((data, { addIssue }) => {
      for (const validate of validators) {
        for (const issue of validate(data)) {
          addIssue(issue);
        }
      }
    })
    .transform((data) => flow(...transformers)(data));
  const defaults = base.parse({}); // Clever way to pull default values out of zod schema

  return { base, full, defaults };
}
