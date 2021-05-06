import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { DEV_MODE } from '../../../utils/constants';
import { addCORSHeader } from '../../../utils/responseUtils';
import { listDocs } from './list';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return listDocs(fastify, request)
      .then((res) => {
        if (DEV_MODE) {
          addCORSHeader(request, reply);
        }
        return res;
      })
      .catch((res) => {
        if (DEV_MODE) {
          addCORSHeader(request, reply);
        }
        reply.send(res);
      });
  });
};
