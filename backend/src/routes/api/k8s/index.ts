import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance } from '../../../types';
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
      }>,
    ) => {
      const data = JSON.stringify(req.body);
      const kubeUri = req.params['*'];
      const url = `${cluster.server}/${kubeUri}`;
      console.debug('-----', url);

      return passThrough({ url, method: req.method, requestData: data }, fastify);
    },
  });
};
