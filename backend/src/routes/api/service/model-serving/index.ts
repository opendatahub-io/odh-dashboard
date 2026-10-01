import { KubeFastifyInstance } from '../../../../types';
import { getNamespaces } from '../../../../utils/notebookUtils';
import { proxyService } from '../../../../utils/proxy';

/**
 * This file creates a `/api/service/model-serving` route on the dashboard nodejs server.
 * It forwards gateway discovery and configuration samples to the model-serving-api service
 * in the dashboard namespace.
 *
 * `<dashboard route>/api/service/model-serving/api/v1/gateways`
 *  ↓
 * `model-serving-api.<dashboardNamespace>.svc.cluster.local:443/api/v1/gateways`
 *
 * Current endpoints:
 * GET `/api/v1/gateways?namespace={ns}`
 * GET `/api/v1/samples/llm-d?type={topology}`
 * GET `/api/v1/samples/llm-d?type=router&topology={topology}`
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
const registerModelServingProxy = proxyService(
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

const gatewaysPath = '/api/service/model-serving/api/v1/gateways';
const samplesPath = '/api/service/model-serving/api/v1/samples/llm-d';
// Keep this transport allowlist local; the backend must not import a feature package.
const sampleTopologies = new Set([
  'workload-single-node',
  'workload-multi-node-data-parallel',
  'workload-single-node-pd',
  'workload-multi-node-data-parallel-pd',
]);

/** Expose only validated operations; never accept an upstream service or arbitrary API path. */
export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.addHook('onRequest', async (request, reply) => {
    const [path, ...query] = request.url.split('?');
    if (path !== gatewaysPath && path !== samplesPath) {
      return reply.code(404).send({ message: 'Not found' });
    }
    if (request.method !== 'GET') {
      return reply.header('Allow', 'GET').code(405).send({ message: 'Method not allowed' });
    }
    // Only the first question mark separates the path; validate the entire query.
    const params = new URLSearchParams(query.join('?'));
    if (path === samplesPath) {
      const isRouter = params.get('type') === 'router';
      const allowedKeys = isRouter ? ['type', 'topology'] : ['type'];
      const topology = params.get(isRouter ? 'topology' : 'type') ?? '';
      if (
        Array.from(params.keys()).some((key) => !allowedKeys.includes(key)) ||
        params.getAll('type').length !== 1 ||
        (isRouter && params.getAll('topology').length !== 1) ||
        !sampleTopologies.has(topology)
      ) {
        return reply
          .code(400)
          .send({ message: 'A valid sample type and matching topology are required' });
      }
      return;
    }
    const namespace = params.get('namespace') ?? '';
    if (
      Array.from(params.keys()).some((key) => key !== 'namespace') ||
      params.getAll('namespace').length !== 1 ||
      !/^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$/.test(namespace)
    ) {
      return reply.code(400).send({ message: 'A valid project namespace is required' });
    }
  });
  await registerModelServingProxy(fastify);
};
