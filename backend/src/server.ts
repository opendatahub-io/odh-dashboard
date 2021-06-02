import { fastify } from 'fastify';
import Pino from 'pino';
import { APP_ENV, PORT, IP, LOG_LEVEL } from './utils/constants';
import { initializeApp } from './app';
import { AddressInfo } from 'net';

const logOptions = {
  level: LOG_LEVEL,
  prettyPrint: APP_ENV === 'development' ? { translateTime: true } : false,
};

const app = fastify({
  logger: Pino(logOptions),
  pluginTimeout: 10000,
});

app.register(initializeApp);

app.listen(PORT, IP, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1); // eslint-disable-line
  }
  const address: AddressInfo = app.server.address() as AddressInfo;
  console.log('Fastify Connected...');
  console.log(`Server listening on >>>  ${address.address}:${address.port}`);
});
