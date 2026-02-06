import * as z from 'zod';

export function getRequiredFields(schema: z.ZodTypeAny): string[] {
  const result = schema.safeParse({});
  const requiredFields: Set<string> = new Set();

  if (!result.success) {
    for (const issue of result.error.issues) {
      // Join path parts (e.g., ['address', 'street']) into a single key ('address.street')
      const fieldPath = issue.path.join('.');
      requiredFields.add(fieldPath);
    }
  }

  return Array.from(requiredFields);
}
