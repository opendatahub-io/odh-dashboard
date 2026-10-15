import * as fs from 'fs';
import * as path from 'path';
import { LOG_DIR } from './utils/constants';
import fastifyStatic from '@fastify/static';
import view from '@fastify/view';
import fastifySensible from '@fastify/sensible';
import fastifyWebsocket from '@fastify/websocket';
import fastifyAccepts from '@fastify/accepts';
import type { FastifyInstance, FastifyRegisterOptions } from 'fastify';
import ejs from 'ejs';
import { getCacheControlForStaticFile } from './utils/cacheHeaders';
import { applySecurityHeaders, X_CONTENT_TYPE_OPTIONS } from './utils/securityHeaders';
import { registerPlugins, registerRoutes } from './register-routes';

const publicDir = process.env.ODH_STATIC_DIR
  ? path.resolve(process.env.ODH_STATIC_DIR)
  : path.resolve(process.cwd(), '../frontend/public');

export const initializeApp = async (
  fastify: FastifyInstance,
  opts: FastifyRegisterOptions<unknown>,
): Promise<void> => {
  if (!fs.existsSync(LOG_DIR)) {
    fastify.log.info(`${LOG_DIR} does not exist. Creating`);
    fs.mkdirSync(LOG_DIR);
  }

  fastify.addHook('onSend', async (request, reply, payload) => {
    applySecurityHeaders(request, reply);
    return payload;
  });

  fastify.register(fastifySensible);

  fastify.register(fastifyWebsocket);

  // The ws server writes the 101 Switching Protocols response directly — Fastify's
  // onSend hook does not run for WebSocket routes. Inject nosniff via the ws 'headers'
  // event to match the normal-response security headers and OpenShift Console's approach
  // for gorilla/websocket upgrade responses (console#17376).
  fastify.after(() => {
    fastify.websocketServer.on('headers', (headers: string[]) => {
      headers.push(`X-Content-Type-Options: ${X_CONTENT_TYPE_OPTIONS}`);
    });
  });

  fastify.register(fastifyStatic, {
    root: publicDir,
    wildcard: false,
    // Do not auto-serve index.html for '/'; let the view route render it
    index: false,
    setHeaders: (reply, filePath) => {
      reply.header('Cache-Control', getCacheControlForStaticFile(filePath));
    },
  });

  // Configure EJS to use a non-conflicting delimiter
  ejs.delimiter = '?';
  fastify.register(view, {
    engine: { ejs },
    root: publicDir,
    viewExt: 'html',
    includeViewExtension: true,
  });

  await registerPlugins(fastify, opts);
  await registerRoutes(fastify, opts);

  fastify.register(fastifyAccepts);
};
