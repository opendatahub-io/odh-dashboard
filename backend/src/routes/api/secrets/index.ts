import { V1Secret } from '@kubernetes/client-node';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getSecret, postSecret, replaceSecret } from './secretUtils';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/:name', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as {
      name: string;
    };
    return getSecret(fastify, params.name)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const secret = request.body as V1Secret;
    try {
      postSecret(fastify, secret);
      return `Secret succesfully created`;
    } catch (e) {
      reply.send(`Secret could not be created ${e}`);
    }
  });
  fastify.put('/:name', async (request: FastifyRequest, reply: FastifyReply) => {
    const secret = request.body as V1Secret;
    const params = request.params as {
      name: string;
    };
    try {
      replaceSecret(fastify, secret, params.name);
      return `Secret succesfully replaced`;
    } catch (e) {
      reply.send(`Secret could not be replaced ${e}`);
    }
  });
};
