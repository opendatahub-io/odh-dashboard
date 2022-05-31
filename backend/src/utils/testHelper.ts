import Fastify from 'fastify';
import fastifyAutoload from 'fastify-autoload';
import * as path from 'path';

// eslint-disable-next-line
export const build = () => {
  const app = Fastify();

  beforeAll(async () => {
    app.register(fastifyAutoload, {
      dir: path.join(__dirname, '../routes'),
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  return app;
};
