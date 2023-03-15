import { FastifyReply, FastifyRequest } from 'fastify';
import { KubeFastifyInstance } from '../../../types';
import { USER_ACCESS_TOKEN } from '../../../utils/constants';
import { passThrough } from './pass-through';
import { logRequestDetails } from '../../../utils/fileUtils';

module.exports = async (fastify: KubeFastifyInstance) => {
  const kc = fastify.kube.config;
  const cluster = kc.getCurrentCluster();

  /**
   * Pass through API for all things kubernetes
   * Acts on the user who made the call -- does not need route security; k8s provides that.
   */
  fastify.route({
    method: ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS'],
    url: '/*',
    handler: (
      req: FastifyRequest<{
        Querystring: Record<string, string>;
        Params: { '*': string; [key: string]: string };
        Body: { [key: string]: unknown };
        Headers: { [USER_ACCESS_TOKEN]: string };
      }>,
      reply: FastifyReply,
    ) => {
      logRequestDetails(fastify, req);

      const data = JSON.stringify(req.body);
      const kubeUri = req.params['*'];
      let url = `${cluster.server}/${kubeUri}`;

      // Apply query params
      const query = req.query;
      if (Object.keys(query)) {
        url += `?${Object.keys(query)
          .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
          .join('&')}`;
      }

      return passThrough(fastify, req, { url, method: req.method, requestData: data }).catch(
        ({ code, response }) => {
          reply.code(code);
          reply.send(response);
        },
      );
    },
  });
};
