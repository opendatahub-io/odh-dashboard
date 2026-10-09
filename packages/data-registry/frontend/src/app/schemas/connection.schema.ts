import * as z from 'zod';

const displayFields = {
  name: z.string().optional(),
  connectionType: z.string().optional(),
};

const rhaiConnectionSchema = z.object({
  type: z.literal('secret'),
  // eslint-disable-next-line camelcase
  secret_name: z.string().min(1),
  ...displayFields,
});

// Saved references can outlive a lookup. Preserve their identifiers even when unavailable.
export const connectionRefSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('dch'), id: z.string().min(1), ...displayFields }),
  // eslint-disable-next-line camelcase
  z.object({ type: z.literal('secret'), secret_name: z.string().min(1), ...displayFields }),
]);

export const connectionsResponseSchema = z.object({
  data: z.array(
    z.discriminatedUnion('type', [
      z.object({ type: z.literal('dch'), id: z.string().uuid(), ...displayFields }),
      // eslint-disable-next-line camelcase
      z.object({ type: z.literal('secret'), secret_name: z.string().min(1), ...displayFields }),
    ]),
  ),
  metadata: z
    .object({
      warnings: z
        .array(
          z.object({
            code: z.enum(['UNRESOLVED_CONNECTION_TYPE', 'DCH_FALLBACK', 'RHAI_LOOKUP_FAILED']),
            message: z.string(),
          }),
        )
        .optional(),
      rhaiConnections: z.array(rhaiConnectionSchema).optional(),
    })
    .optional(),
});
