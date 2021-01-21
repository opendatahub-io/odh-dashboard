'use strict';
const fastify = require('fastify');
const pino = require('pino');

const { APP_ENV, PORT, IP, LOG_LEVEL } = require('./utils/constants');

const logOptions = {
  level: LOG_LEVEL,
  prettyPrint: APP_ENV === 'development' ? { translateTime: true } : false
};

const app = fastify({
  logger: pino(logOptions),
  pluginTimeout: 10000,
});

app.register(require('./app.js'));

app.listen(PORT, IP, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1); // eslint-disable-line
  }
  console.log('Fastify Connected...');
  console.log(
    `Server listening on >>>  ${app.server.address().address}:${app.server.address().port}`,
  );
});
