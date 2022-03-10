import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { DEV_MODE } from '../../../utils/constants';
import { getClusterSettings, updateClusterSettings } from './clusterSettingsUtils';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return getClusterSettings(fastify)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });

  fastify.get('/update', async (request: FastifyRequest, reply: FastifyReply) => {
    return updateClusterSettings(fastify, request)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });
};
