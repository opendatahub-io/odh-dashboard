import type { FastifyRequest } from 'fastify';

const EMPTY_BODY_METHODS = new Set(['DELETE', 'GET', 'HEAD', 'OPTIONS']);

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
  const contentLength = req.headers['content-length'];
  // `content-length` is absent on chunked requests too, and those do carry a body. Only treat
  // the request as bodyless when neither header indicates otherwise, so a chunked payload is
  // never silently dropped by having its content type removed.
  if (contentLength !== '0' && (contentLength || req.headers['transfer-encoding'])) {
    return;
  }
  const contentType = req.headers['content-type'];
  if (contentType && /application\/json/i.test(contentType)) {
    delete req.headers['content-type'];
  }
};
