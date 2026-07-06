import { FastifyReply, FastifyRequest } from 'fastify';
import { listDocs } from './list';
import { KubeFastifyInstance } from '../../../types';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) =>
    listDocs(fastify, request)
      .then((res) => res)
      .catch((res) => {
        reply.send(res);
      }),
  );
};
