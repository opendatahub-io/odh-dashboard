'use strict'

const path = require('path')
const Static = require('fastify-static')
const Cors = require('fastify-cors')

const { getData } = require('./connectKube');


module.exports = function (fastify, opts, next) {

    fastify.register(Cors, { 
        origin: true
       })
  
    fastify.register(Static, {
        root: path.join(__dirname, 'frontend/build'),
        wildcard: false
      });
      
    fastify.get('/*', function(req, reply) {
        reply.sendFile('index.html');
      });

    fastify.get('/api/components', function (req, reply) {
      
      getData();
      //console.log(data)

      reply.sendFile('odhDataRes.json');
      
    fastify.get('/api/components', function (req, reply) {
        reply.sendFile('odhDataRes.json')
      })  

  next()
}