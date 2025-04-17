import { FastifyReply, FastifyRequest } from 'fastify';
import { listQuickStarts } from './list';
import { KubeFastifyInstance } from '../../../types';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) =>
    listQuickStarts()
      .then((res) => res)
      .catch((res) => {
        reply.send(res);
      }),
  );
};
