import { FastifyReply, FastifyRequest } from 'fastify';
import { KubeFastifyInstance } from '../../../types';
import { listQuickStarts } from './list';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return listQuickStarts()
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });
};
