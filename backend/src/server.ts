import { fastify } from 'fastify';
import pino from 'pino';
import { APP_ENV, PORT, IP, LOG_LEVEL } from './utils/constants';
import { initializeApp } from './app';
import { AddressInfo } from 'net';

const transport =
  APP_ENV === 'development'
    ? pino.transport({
        target: 'pino-pretty',
        options: { colorize: true },
      })
    : undefined;

const app = fastify({
  logger: pino({ level: LOG_LEVEL }, transport),
  pluginTimeout: 10000,
});

app.register(initializeApp);

app.listen({ port: PORT, host: IP}, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1); // eslint-disable-line
  }
  const address: AddressInfo = app.server.address() as AddressInfo;
  console.log('Fastify Connected...');
  console.log(`Server listening on >>>  ${address.address}:${address.port}`);
});
