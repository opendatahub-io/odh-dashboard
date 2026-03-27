import { KubeFastifyInstance } from '../../../../types';
import { getNamespaces } from '../../../../utils/notebookUtils';
import { registerProxy } from '../../../../utils/proxy';

/**
 * Proxy the model-serving-api service.
 * Current endpoints:
 * GET `/api/v1/gateways?namespace={ns}`
 * Example response body:
 * ```json
 * {
 *   "gateways": [
 *     {
 *       "name": "gateway-1",
 *       "namespace": "namespace-1",
 *       "listener": "http",
 *       "status": "Ready"
 *     }
 *   ]
 * }
 * ```
 */
export default async (fastify: KubeFastifyInstance): Promise<void> => {
  const { dashboardNamespace } = getNamespaces(fastify);

  await registerProxy(fastify, {
    prefix: '/',
    rewritePrefix: '/',
    authorize: true,
    tls: true,
    service: {
      name: 'model-serving-api',
      namespace: dashboardNamespace,
      port: 443,
    },
    local: {
      // kubectl port-forward -n opendatahub svc/model-serving-api 9443:443
      port: 9443,
    },
  });
};
