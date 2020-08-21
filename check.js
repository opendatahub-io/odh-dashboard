'use strict'

const fastify = require('fastify')

const app = fastify({
  logger: true,
  pluginTimeout: 10000
})

app.get('/hello', function (request, reply) {
    reply.send({ hello: 'world' })
  })

 app.listen(8080, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  console.log('Fastify Connected...')
  console.log(`Server listening on >>> ${app.server.address().port}`)
})

module.exports = app
  