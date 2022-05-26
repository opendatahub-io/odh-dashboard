import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  addNotebook,
  deleteNotebook,
  getNotebook,
  getNotebooks,
  updateNotebook,
} from './notebooksImageStreamUtils';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return getNotebooks(fastify)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });

  fastify.get('/:notebook', async (request: FastifyRequest, reply: FastifyReply) => {
    return getNotebook(fastify, request)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });

  fastify.delete('/:notebook', async (request: FastifyRequest, reply: FastifyReply) => {
    return deleteNotebook(fastify, request)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });

  fastify.put('/:notebook', async (request: FastifyRequest, reply: FastifyReply) => {
    return updateNotebook(fastify, request)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });

  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return addNotebook(fastify, request)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });
};
