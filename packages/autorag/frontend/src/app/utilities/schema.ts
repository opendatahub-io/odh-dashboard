import { flow } from 'es-toolkit';
import * as z from 'zod';

export function createSchema<Schema extends z.ZodObject>(options: {
  schema: Schema;
  validators?: Array<(data: z.infer<Schema>) => Array<z.core.$ZodRawIssue>>;
  transformers?: Array<(data: z.infer<Schema>) => z.infer<Schema>>;
}): z.ZodPipe<Schema, z.ZodTransform<Awaited<z.core.output<Schema>>, z.core.output<Schema>>> {
  const { schema, validators = [], transformers = [] } = options;
  return schema
    .superRefine((data, { addIssue }) => {
      for (const validate of validators) {
        for (const issue of validate(data)) {
          addIssue(issue);
        }
      }
    })
    .transform((data) => flow(...transformers)(data));
}
