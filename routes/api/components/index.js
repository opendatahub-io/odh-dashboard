const _ = require("lodash");
const list = require("./list");

module.exports = async function (fastify, opts) {
  fastify.get("/", async (request, reply) => {
    return list({ fastify, opts, request, reply });
  });
};
