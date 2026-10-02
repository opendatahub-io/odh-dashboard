import * as z from 'zod';

const displayFields = {
  name: z.string().optional(),
  connectionType: z.string().optional(),
};

// Saved references can outlive a lookup. Preserve their identifiers even when unavailable.
export const connectionRefSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('dch'), id: z.string().min(1), ...displayFields }),
  // eslint-disable-next-line camelcase
  z.object({ type: z.literal('rhai'), secret_name: z.string().min(1), ...displayFields }),
]);

export const connectionsResponseSchema = z.object({
  data: z.array(
    z.discriminatedUnion('type', [
      z.object({ type: z.literal('dch'), id: z.string().uuid(), ...displayFields }),
      // eslint-disable-next-line camelcase
      z.object({ type: z.literal('rhai'), secret_name: z.string().min(1), ...displayFields }),
    ]),
  ),
  metadata: z
    .object({
      warnings: z
        .array(
          z.object({
            code: z.literal('UNRESOLVED_CONNECTION_TYPE'),
            message: z.string(),
          }),
        )
        .optional(),
    })
    .optional(),
});
