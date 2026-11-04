import { fastify } from 'fastify';
import pino from 'pino';
import { APP_ENV, PORT, IP, LOG_LEVEL } from './utils/constants';
import { initializeApp } from './app';
import { registerPatchContentTypeParsers } from './utils/patchContentTypeParsers';
import { AddressInfo } from 'net';
import https from 'https';
import { getTrustedCAs } from './utils/caBundles';

const transport =
  APP_ENV === 'development'
    ? pino.transport({
        target: 'pino-pretty',
        options: { colorize: true },
      })
    : undefined;

const app = fastify({
  // Increase body limit to 32MB to support file uploads (matches gen-ai BFF limit)
  bodyLimit: 32 * 1024 * 1024,
  // set to kubernetes max name length
  routerOptions: {
    maxParamLength: 253,
  },
  loggerInstance: pino(
    {
      level: LOG_LEVEL,
      redact: [
        'err.response.request.headers.Authorization',
        'response.request.headers.Authorization',
        'request.headers.Authorization',
        'headers.Authorization',
        'Authorization',
      ],
    },
    transport,
  ),
  pluginTimeout: 10000,
});

// Fastify 5 requires explicit parsers for K8s PATCH content types (json-patch and merge-patch).
registerPatchContentTypeParsers(app);

app.register(initializeApp);

app.listen({ port: PORT, host: IP }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1); // eslint-disable-line
  }
  https.globalAgent.options.ca = getTrustedCAs();

  const address: AddressInfo = app.server.address() as AddressInfo;
  console.log('Fastify Connected...');
  console.log(`Server listening on >>>  ${address.address}:${address.port}`);
});
