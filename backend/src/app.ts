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

  fastify.register(fastifySensible);

  fastify.register(fastifyWebsocket);

  fastify.register(fastifyStatic, {
    root: publicDir,
    wildcard: false,
    // Do not auto-serve index.html for '/'; let the view route render it
    index: false,
    setHeaders: (res, filePath) => {
      res.setHeader('Cache-Control', getCacheControlForStaticFile(filePath));
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
