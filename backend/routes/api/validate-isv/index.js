const { DEV_MODE } = require('../../../utils/constants');
const responseUtils = require('../../../utils/responseUtils');
const validateISV = require('./validateISV');

module.exports = async (fastify, opts) => {
  fastify.get('/', async (request, reply) => {
    return validateISV
      .createValidationJob({ fastify, opts, request, reply })
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
        fastify.log.error(`Failed to create validation job: ${res.response?.body?.message}`);
        reply.send(res);
      });
  });
};
