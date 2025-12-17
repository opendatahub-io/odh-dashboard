import * as fs from 'fs';
import * as path from 'path';
import { LOG_DIR } from './utils/constants';
import fastifyStatic from '@fastify/static';
import view from '@fastify/view';
import fastifyAutoload from '@fastify/autoload';
import fastifySensible from '@fastify/sensible';
import fastifyWebsocket from '@fastify/websocket';
import fastifyAccepts from '@fastify/accepts';
import type { FastifyInstance, FastifyRegisterOptions } from 'fastify';
import ejs from 'ejs';

const publicDir = path.join(__dirname, '../../frontend/public');

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
  });

  // Configure EJS to use a non-conflicting delimiter
  ejs.delimiter = '?';
  fastify.register(view, {
    engine: { ejs },
    root: publicDir,
    viewExt: 'html',
    includeViewExtension: true,
  });

  fastify.register(fastifyAutoload, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts),
  });

  fastify.register(fastifyAutoload, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({}, opts),
  });

  fastify.register(fastifyAccepts);
};
