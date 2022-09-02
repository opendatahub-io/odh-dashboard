import { FastifyReply, FastifyRequest } from 'fastify';
import { KubeFastifyInstance } from '../../../types';
import { USER_ACCESS_TOKEN } from '../../../utils/constants';
import { passThrough } from './pass-through';

module.exports = async (fastify: KubeFastifyInstance) => {
  const kc = fastify.kube.config;
  const cluster = kc.getCurrentCluster();

  /** Pass through API for all things kubernetes */
  fastify.route({
    method: ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS'],
    url: '/*',
    handler: (
      req: FastifyRequest<{
        Params: { '*': string; [key: string]: string };
        Body: { [key: string]: unknown };
        Headers: { [USER_ACCESS_TOKEN]: string };
      }>,
      reply: FastifyReply,
    ) => {
      const data = JSON.stringify(req.body);
      const kubeUri = req.params['*'];
      const url = `${cluster.server}/${kubeUri}`;

      return passThrough(fastify, req, { url, method: req.method, requestData: data }).catch(
        ({ code, response }) => {
          reply.code(code);
          reply.send(response);
        },
      );
    },
  });
};
