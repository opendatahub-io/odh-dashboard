'use strict';

module.exports = async function (fastify) {
  fastify.get('/*', function (req, reply) {
    reply.notFound();
  });
};
