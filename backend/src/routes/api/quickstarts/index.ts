import { FastifyReply, FastifyRequest } from 'fastify';
import { KubeFastifyInstance } from '../../../types';
import { getInstalledQuickStarts } from './quickStartUtils';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return getInstalledQuickStarts(fastify)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });
};
