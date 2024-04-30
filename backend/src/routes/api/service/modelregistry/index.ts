import httpProxy from '@fastify/http-proxy';
import { KubeFastifyInstance } from '../../../../types';
import { DEV_MODE } from '../../../../utils/constants';
import { getParam, setParam } from '../../../../utils/proxy';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.register(httpProxy, {
    upstream: '',
    prefix: '/:name',
    rewritePrefix: '',
    replyOptions: {
      // preHandler must set the `upstream` param
      getUpstream: (request) => getParam(request, 'upstream'),
    },
    preHandler: (request, _, done) => {
      const name = getParam(request, 'name');

      const upstream = DEV_MODE
        ? // Use port forwarding for local development:
          // kubectl port-forward -n <namespace> svc/<service-name> <local.port>:<service.port>
          `http://${process.env.MODEL_REGISTRY_SERVICE_HOST}:${process.env.MODEL_REGISTRY_SERVICE_PORT}`
        : // Construct service URL
          `http://${name}.odh-model-registries.svc.cluster.local:8080`;

      // assign the `upstream` param so we can dynamically set the upstream URL for http-proxy
      setParam(request, 'upstream', upstream);

      fastify.log.info(`Proxy ${request.method} request ${request.url} to ${upstream}`);
      done();
    },
  });
};
