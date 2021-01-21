const { DEV_MODE } = require('../../../utils/constants');

const list = require('./list');

const addCORSHeader = (req, reply) => {
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

module.exports = async function (fastify, opts) {
  fastify.get('/', async (request, reply) => {
    return list({ fastify, opts, request, reply })
      .then((res) => {
        if (DEV_MODE) {
          addCORSHeader(request, reply);
        }
        return res;
      })
      .catch((res) => {
        if (DEV_MODE) {
          addCORSHeader(request, reply);
        }
        reply.send(res);
      });
  });
};
