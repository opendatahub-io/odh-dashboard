import * as z from 'zod';

/**
 * Derives required field names by parsing an empty object against the schema.
 * NOTE: Only reliable for flat, non-defaulted schemas. Nested required fields
 * and fields with defaults will not be detected.
 */
export function getRequiredFields(schema: z.ZodType): string[] {
  const result = schema.safeParse({});
  const requiredFields: Set<string> = new Set();

  if (!result.success) {
    for (const issue of result.error.issues) {
      const fieldPath = issue.path.join('.');
      requiredFields.add(fieldPath);
    }
  }

  return Array.from(requiredFields);
}
