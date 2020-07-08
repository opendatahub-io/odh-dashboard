'use strict'

const fastify = require('fastify')
const {PORT, IP} = require('./utils/constants');

const app = fastify({
  logger: true,
  pluginTimeout: 10000
})

app.register(require('./app.js'))

app.listen(PORT, IP, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  console.log('Fastify Connected...')
  console.log(`Server listening on >>> ${app.server.address().port}`)
})