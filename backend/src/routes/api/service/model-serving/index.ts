import { KubeFastifyInstance } from '../../../../types';
import { getNamespaces } from '../../../../utils/notebookUtils';
import { proxyService } from '../../../../utils/proxy';

/**
 * This file creates a `/api/service/model-serving` route on the dashboard nodejs server.
 * It forwards requests to the model-serving-api service in the dashboard namespace.
 *
 * `<dashboard route>/api/service/model-serving/<api-path>`
 *  ↓
 * `model-serving-api.<dashboardNamespace>.svc.cluster.local:443/<api-path>`
 *
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
export default proxyService(
  null,
  {
    // Destination URL: model-serving-api.<dashboardNamespace>.svc.cluster.local:443
    name: 'model-serving-api',
    namespace: (fastify: KubeFastifyInstance) => getNamespaces(fastify).dashboardNamespace,
    internalPort: 443,
  },
  {
    // Use port forwarding for local development:
    // `kubectl port-forward -n opendatahub svc/model-serving-api 8443:443`
    // then to test locally you can use:
    // `curl "http://localhost:4010/api/service/model-serving/api/v1/gateways?namespace=<ds project namespace>"
    host: 'localhost',
    port: 8443,
  },
  null,
);
