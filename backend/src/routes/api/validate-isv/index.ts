import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { DEV_MODE } from '../../../utils/constants';
import { addCORSHeader } from '../../../utils/responseUtils';
import { getValidateISVResults, validateISV } from './validateISV';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return validateISV(fastify, request)
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
        fastify.log.error(`Failed to create validation job: ${res.response?.body?.message}`);
        reply.send(res);
      });
  });
  fastify.get('/results', async (request: FastifyRequest, reply: FastifyReply) => {
    return getValidateISVResults(fastify, request)
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
        fastify.log.error(`Failed to get validation job results: ${res.response?.body?.message}`);
        reply.send(res);
      });
  });
};
