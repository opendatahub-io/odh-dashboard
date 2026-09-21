import type { FastifyRequest } from 'fastify';

const EMPTY_BODY_METHODS = new Set(['DELETE', 'GET', 'HEAD', 'OPTIONS']);
const JSON_CONTENT_TYPE = /application\/json/i;

/**
 * Fastify 5 rejects a request that declares `Content-Type: application/json` but sends an empty
 * body (`FST_ERR_CTP_EMPTY_JSON_BODY`, HTTP 400); Fastify 4 accepted it. Dropping the header on
 * bodyless requests keeps Fastify from trying to parse them.
 *
 * The dashboard does not currently produce such a request — the K8s SDK's `k8sDeleteResource`
 * falls back to `{}` — so this is defensive against any caller that sends the header alone.
 */
export const stripEmptyJsonContentType = (req: FastifyRequest): void => {
  if (!EMPTY_BODY_METHODS.has(req.method)) {
    return;
  }
  // A chunked request carries a body regardless of any content-length it also sends, so it is
  // never treated as bodyless.
  if (req.headers['transfer-encoding']) {
    return;
  }
  const contentLength = req.headers['content-length'];
  if (contentLength && contentLength !== '0') {
    return;
  }
  const contentType = req.headers['content-type'];
  if (contentType && JSON_CONTENT_TYPE.test(contentType)) {
    delete req.headers['content-type'];
  }
};
