import { KubeFastifyInstance } from '../../../types';

//TODO: https://github.com/kubernetes-client/javascript/blob/master/FETCH_MIGRATION.md
// Due to request library being deprecated, we'll need to swap out to the new one
// when the kubeclient does.
// '@kubernetes/client-node' dependency
import httpClient from 'request';

/** Raw proxy for kubernetes requests with user permissions.  Should be used for any available user authorized requests */
module.exports = async (fastify: KubeFastifyInstance) => {
  const kc = fastify.kube.config;
  const cluster = kc.getCurrentCluster();
  fastify.route({
    method: ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS'],
    url: '/*',
    handler: function (request, reply) {
      const params = request.params as {
        [key: string]: string;
      };
      const query = request.query as {
        [key: string]: string;
      };
      const kubeUri = params['*'];
      const opts = {} as httpClient.Options;
      const uri = `${cluster.server}/${kubeUri}`;
      //TODO: these requests should be done with the correct user context.
      // Preferably with the correct bearer token and add to the header instead of kc.applyToRequest:
      // Authorization: Bearer sha256~blahblahblah
      kc.applyToRequest(opts).then(() => {
        opts.json = true;
        opts.method = request.method;
        opts.body = request.body;
        opts.qs = query;
        httpClient(uri, opts, (error, response, body) => {
          if (error) {
            fastify.log.error(`Kube request error: ${error}`);
            reply.code(500);
            reply.send(error);
          }
          if (response) {
            reply.code(response?.statusCode);
            reply.send(body);
          }
        });
      });
    },
  });
};
