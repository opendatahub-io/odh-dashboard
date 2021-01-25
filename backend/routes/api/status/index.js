'use strict';

module.exports = async function (fastify) {
  fastify.get('/', async (request, reply) => {
    const kubeContext = fastify.kube.currentContext;
    let body = {};
    const { currentContext, namespace } = fastify.kube;
    if (!kubeContext && !kubeContext.trim()) {
      body.status = 'Error';
      body.message = 'Unable to connect to Kube API';
      reply.code(500);
    } else {
      body.status = 'OK';
      body.kube = {
        currentContext,
        namespace,
      };
      reply.code(200);
    }
    reply.send(body);
    return reply;
  });
};
