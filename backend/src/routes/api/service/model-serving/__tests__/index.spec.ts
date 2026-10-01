import Fastify from 'fastify';
import type { KubeFastifyInstance } from '../../../../../types';
import registerModelServingRoute from '../index';

const mockProxyRequest = jest.fn();
const mockSample = 'apiVersion: serving.kserve.io/v1alpha2\nkind: LLMInferenceServiceConfig\n';

jest.mock('../../../../../utils/proxy', () => ({
  proxyService: jest.fn(() => async (app: KubeFastifyInstance) => {
    app.all('/*', async (request, reply) => {
      mockProxyRequest(request.url);
      return request.url.includes('/samples/')
        ? reply.type('application/yaml').send(mockSample)
        : { gateways: [] };
    });
  }),
}));

describe('model-serving route boundaries', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['GET', '/api/service/model-serving/api/v1/gateways?namespace=project-a', 200],
    ['POST', '/api/service/model-serving/api/v1/gateways?namespace=project-a', 405],
    ['GET', '/api/service/model-serving/api/v1/secrets?namespace=project-a', 404],
    ['GET', '/api/service/model-serving/https://other.example', 404],
    ['GET', '/api/service/model-serving/api/v1/gateways', 400],
    ['GET', '/api/service/model-serving/api/v1/gateways?namespace=../other', 400],
    ['GET', '/api/service/model-serving/api/v1/gateways?namespace=project-a?extra=value', 400],
    ['GET', '/api/service/model-serving/api/v1/gateways?namespace=project-a%3Fextra=value', 400],
    ['GET', '/api/service/model-serving/api/v1/gateways?namespace=project-a?&service=other', 400],
    ['GET', '/api/service/model-serving/api/v1/gateways?namespace=a&namespace=b', 400],
    ['GET', '/api/service/model-serving/api/v1/gateways?namespace=a&path=/secrets', 400],
    ['GET', '/api/service/model-serving/api/v1/gateways?namespace=a&service=other', 400],
  ] as const)('should constrain %s %s', async (method, url, status) => {
    const app = Fastify();
    await app.register(registerModelServingRoute);
    const response = await app.inject({ method, url });
    expect(response.statusCode).toBe(status);
    expect(mockProxyRequest).toHaveBeenCalledTimes(status === 200 ? 1 : 0);
    await app.close();
  });

  const samplesPath = '/api/service/model-serving/api/v1/samples/llm-d';
  const topologies = [
    'workload-single-node',
    'workload-multi-node-data-parallel',
    'workload-single-node-pd',
    'workload-multi-node-data-parallel-pd',
  ];

  it.each(
    topologies.flatMap((topology) => [`type=${topology}`, `type=router&topology=${topology}`]),
  )('should pass through the sample YAML and query for %s', async (query) => {
    const app = Fastify();
    await app.register(registerModelServingRoute);
    const url = `${samplesPath}?${query}`;
    const response = await app.inject({ method: 'GET', url });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(mockSample);
    expect(response.headers['content-type']).toContain('application/yaml');
    expect(mockProxyRequest).toHaveBeenCalledWith(url);
    await app.close();
  });

  it.each([
    '',
    '?type=',
    '?type=unknown',
    '?type=router',
    '?type=router&topology=unknown',
    '?type=router&topology=../other',
    '?type=workload-single-node&topology=workload-single-node',
    '?type=workload-single-node&type=router',
    '?type=router&topology=workload-single-node&topology=workload-single-node-pd',
    '?type=workload-single-node&service=other',
    '?type=router&topology=workload-single-node&path=/secrets',
    '?type=workload-single-node?extra=value',
    '?type=workload-single-node%3Fextra=value',
    '?type=workload-single-node%ZZ',
  ])('should reject invalid sample query %s before proxying', async (query) => {
    const app = Fastify();
    await app.register(registerModelServingRoute);
    const response = await app.inject({ method: 'GET', url: samplesPath + query });
    expect(response.statusCode).toBe(400);
    expect(mockProxyRequest).not.toHaveBeenCalled();
    await app.close();
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const)(
    'should reject sample method %s and advertise GET',
    async (method) => {
      const app = Fastify();
      await app.register(registerModelServingRoute);
      const response = await app.inject({
        method,
        url: `${samplesPath}?type=workload-single-node`,
      });
      expect(response.statusCode).toBe(405);
      expect(response.headers.allow).toBe('GET');
      expect(mockProxyRequest).not.toHaveBeenCalled();
      await app.close();
    },
  );

  it.each(['llm-d/extra', '%6clm-d', 'other', 'llm-d/../secrets'])(
    'should reject non-allowlisted sample path %s',
    async (path) => {
      const app = Fastify();
      await app.register(registerModelServingRoute);
      const response = await app.inject({
        method: 'GET',
        url: `/api/service/model-serving/api/v1/samples/${path}?type=workload-single-node`,
      });
      expect(response.statusCode).toBe(404);
      expect(mockProxyRequest).not.toHaveBeenCalled();
      await app.close();
    },
  );
});
