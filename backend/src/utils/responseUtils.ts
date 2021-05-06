import { FastifyReply, FastifyRequest } from 'fastify';

export const addCORSHeader = (req: FastifyRequest, reply: FastifyReply): void => {
  const request = req.raw;
  const origin = request && request.headers && request.headers.origin;
  const hasOrigin = !!origin;
  const originHeader = Array.isArray(origin) ? origin[0] : origin || '*';

  // based on https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
  if (origin) {
    reply.header('Access-Control-Allow-Origin', originHeader);
    reply.header('Vary', 'Origin');
  }
  reply.header('Access-Control-Allow-Credentials', (!hasOrigin).toString());
  reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  const requestHeaders = reply.getHeader('access-control-request-headers');
  if (requestHeaders != null) {
    reply.header(
      'Access-Control-Allow-Headers',
      Array.isArray(requestHeaders) ? requestHeaders.join(', ') : requestHeaders,
    );
  }
};
