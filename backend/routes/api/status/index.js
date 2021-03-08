'use strict';
const createError = require('http-errors');
const { DEV_MODE } = require('../../../utils/constants');
const responseUtils = require('../../../utils/responseUtils');

const status = async ({ fastify }) => {
  const kubeContext = fastify.kube.currentContext;
  const { currentContext, namespace, currentUser } = fastify.kube;
  if (!kubeContext && !kubeContext.trim()) {
    const error = createError(500, 'failed to get kube status');
    error.explicitInternalServerError = true;
    error.error = 'failed to get kube status';
    error.message =
      'Unable to determine current login stats. Please make sure you are logged into OpenShift.';
    fastify.log.error(error, 'failed to get status');
    throw error;
  } else {
    return Promise.resolve({
      kube: {
        currentContext,
        currentUser,
        namespace,
      },
    });
  }
};

module.exports = async (fastify, opts) => {
  fastify.get('/', async (request, reply) => {
    return status({ fastify, opts, request, reply })
      .then((res) => {
        if (DEV_MODE) {
          responseUtils.addCORSHeader(request, reply);
        }
        return res;
      })
      .catch((res) => {
        console.log(`ERROR: devMode: ${DEV_MODE}`);
        if (DEV_MODE) {
          responseUtils.addCORSHeader(request, reply);
        }
        reply.send(res);
      });
  });
};
