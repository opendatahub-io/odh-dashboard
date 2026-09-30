import type { FastifyInstance } from 'fastify';

const PATCH_CONTENT_TYPES = [
  'application/merge-patch+json',
  'application/json-patch+json',
] as const;

const parseJsonBody = (
  _req: unknown,
  body: string | Buffer,
  done: (err: Error | null, result?: unknown) => void,
): void => {
  try {
    done(null, JSON.parse(String(body)));
  } catch (err) {
    (err as Error & { statusCode?: number }).statusCode = 400;
    done(err as Error, undefined);
  }
};

/** Fastify 5 requires explicit parsers for K8s PATCH content types used by the dashboard. */
export const registerPatchContentTypeParsers = (
  app: Pick<FastifyInstance, 'addContentTypeParser'>,
): void => {
  PATCH_CONTENT_TYPES.forEach((contentType) => {
    app.addContentTypeParser(contentType, { parseAs: 'string' }, parseJsonBody);
  });
};
