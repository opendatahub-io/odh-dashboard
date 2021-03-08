'use strict';

const path = require('path');
const Static = require('fastify-static');
const AutoLoad = require('fastify-autoload');
const Sensible = require('fastify-sensible');

module.exports = async (fastify, opts) => {
  fastify.register(Sensible);

  fastify.register(Static, {
    root: path.join(__dirname, '../frontend/public'),
    wildcard: false,
  });

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts),
  });

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({}, opts),
  });
};
