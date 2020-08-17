"use strict";

module.exports = async function (fastify, opts) {
  fastify.get("/*", function (req, reply) {
    reply.notFound();
  });
};
