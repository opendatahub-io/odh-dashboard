import * as z from 'zod';

export function createSchema<Schema extends z.ZodObject>(
  schema: Schema,
  validators: Array<(data: z.infer<Schema>) => Array<z.core.$ZodRawIssue>>,
  transformers: Array<(data: z.infer<Schema>) => void>,
): {
  schema: z.ZodPipe<Schema, z.ZodTransform<Awaited<z.core.output<Schema>>, z.core.output<Schema>>>;
} {
  return {
    schema: schema
      .superRefine((data, { addIssue }) => {
        for (const validate of validators) {
          for (const issue of validate(data)) {
            addIssue(issue);
          }
        }
      })
      .transform((data) => {
        for (const transform of transformers) {
          transform(data);
        }
        return data;
      }),
  };
}
