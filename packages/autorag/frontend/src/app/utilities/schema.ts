import { Path } from 'react-hook-form';
import * as z from 'zod';

export function createSchema<Schema extends z.ZodObject>(
  schema: Schema,
  validators: Array<(data: z.infer<Schema>) => Array<z.core.$ZodRawIssue>>,
  transformers: Array<(data: z.infer<Schema>) => void>,
): {
  schema: z.ZodPipe<Schema, z.ZodTransform<Awaited<z.core.output<Schema>>, z.core.output<Schema>>>;
  isFieldRequired: (path: Path<z.input<typeof schema>>) => boolean;
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

    // The isFieldRequired() function might not handle all
    // Zod types (arrays, unions, discriminated unions, etc.).
    isFieldRequired(path: Path<z.input<typeof schema>>) {
      const keys = path.split('.');
      let currentSchema: z.core.$ZodType = schema;

      // Traverse the schema to the target field.
      for (const key of keys) {
        if (currentSchema instanceof z.ZodObject) {
          currentSchema = currentSchema.shape[key];
        } else if (
          currentSchema instanceof z.ZodOptional ||
          currentSchema instanceof z.ZodNullable
        ) {
          // Unwrap optional/nullable types if traversing through them.
          currentSchema = currentSchema.unwrap();
          if (currentSchema instanceof z.ZodObject) {
            currentSchema = currentSchema.shape[key];
          }
        }
      }

      return !(currentSchema instanceof z.ZodOptional);
    },
  };
}
