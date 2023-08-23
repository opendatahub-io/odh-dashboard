import { FastifyReply } from 'fastify';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { PassThroughData, passThroughText, safePassThroughResource } from './pass-through';
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
      req: OauthFastifyRequest<{
        Querystring: Record<string, string>;
        Params: { '*': string; [key: string]: string };
        Body: { [key: string]: unknown };
      }>,
      reply: FastifyReply,
    ) => {
      logRequestDetails(fastify, req);

      const data = JSON.stringify(req.body);
      const kubeUri = req.params['*'];
      let url = `${cluster.server}/${kubeUri}`;

      // Apply query params
      const query = req.query;
      if (Object.keys(query).length > 0) {
        url += `?${Object.keys(query)
          .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
          .join('&')}`;
      }

      const passThroughData: PassThroughData = {
        url,
        method: req.method,
        requestData: data,
      };

      let promise: Promise<unknown>;
      if (req.headers.accept === 'text/plain') {
        promise = passThroughText(fastify, req, passThroughData);
      } else {
        promise = safePassThroughResource(fastify, req, passThroughData);
      }

      return promise.catch((error) => {
        if (error.code && error.response) {
          const { code, response } = error;
          reply.code(code);
          reply.send(response);
        } else {
          throw error;
        }
      });
    },
  });
};
