import { fastify } from 'fastify';
import pino from 'pino';
import { APP_ENV, PORT, IP, LOG_LEVEL } from './utils/constants';
import { initializeApp } from './app';
import { AddressInfo } from 'net';
import https from 'https';
import fs from 'fs';

const transport =
  APP_ENV === 'development'
    ? pino.transport({
        target: 'pino-pretty',
        options: { colorize: true },
      })
    : undefined;

const app = fastify({
  logger: pino(
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

app.register(initializeApp);

app.listen({ port: PORT, host: IP }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1); // eslint-disable-line
  }
  // Load CA bundle used in our API calls
  // tls-ca-bundle.pem is the default CA bundle used by the system in CentOS/RHEL
  // ca.crt is the default CA bundle provided by the service account for kubernetes
  // service-ca.crt is the CA bundle provided by the service account for kubernetes used by prometheus
  // odh-ca-bundle.crt and odh-trusted-ca-bundle.crt are the CA bundles provided by the ODH platform
  const caPaths = [
    '/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem',
    '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt',
    '/var/run/secrets/kubernetes.io/serviceaccount/service-ca.crt',
    '/etc/pki/tls/certs/odh-ca-bundle.crt',
    '/etc/pki/tls/certs/odh-trusted-ca-bundle.crt',
  ]
    .map(getCABundle)
    .filter((ca) => ca !== undefined);

  https.globalAgent.options.ca = caPaths;

  const address: AddressInfo = app.server.address() as AddressInfo;
  console.log('Fastify Connected...');
  console.log(`Server listening on >>>  ${address.address}:${address.port}`);
});

const getCABundle = (path: string) => {
  try {
    return fs.readFileSync(path);
  } catch (e) {
    // ignore
  }
  return undefined;
};
