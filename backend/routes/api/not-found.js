'use strict';

module.exports = async (fastify) => {
  fastify.get('/*', (req, reply) => {
    reply.notFound();
  });
};
