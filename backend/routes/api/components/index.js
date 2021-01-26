const { DEV_MODE } = require('../../../utils/constants');
const responseUtils = require('../../../utils/responseUtils');
const list = require('./list');

module.exports = async function (fastify, opts) {
  fastify.get('/', async (request, reply) => {
    return list({ fastify, opts, request, reply })
      .then((res) => {
        if (DEV_MODE) {
          responseUtils.addCORSHeader(request, reply);
        }
        return res;
      })
      .catch((res) => {
        if (DEV_MODE) {
          responseUtils.addCORSHeader(request, reply);
        }
        reply.send(res);
      });
  });
};
