import { FastifyReply, FastifyRequest } from 'fastify';
import { KubeFastifyInstance } from '../../../types';
import { USER_ACCESS_TOKEN } from '../../../utils/constants';
import { passThrough, safeURLPassThrough } from './pass-through';
import { logRequestDetails } from '../../../utils/fileUtils';

// TODO: Remove when bug is fixed - https://issues.redhat.com/browse/HAC-1825
// Some resources don't allow metadata.name when creating such as SelfSubjectAccessReview
// this will cause the URL error when we call pass-through function
// we will check this value below to call safeURLPassThrough instead of passThrough
enum resourceWithoutMetadataName {
  'SelfSubjectAccessReview',
}

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

      if (
        req.method.toLowerCase() === 'post' &&
        Object.keys(resourceWithoutMetadataName).includes(`${req.body.kind}`)
      ) {
        return safeURLPassThrough(fastify, req, {
          url,
          method: req.method,
          requestData: data,
        }).catch(({ code, response }) => {
          reply.code(code);
          reply.send(response);
        });
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
