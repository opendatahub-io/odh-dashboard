/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('Agent Ops API Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });

  const apiSchema = loadOpenAPISchema('api/openapi/agent-ops.yaml');

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const result = await apiClient.get('/healthcheck');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/HealthCheckResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('Agent Runtimes Endpoint', () => {
    it('should list agent runtimes', async () => {
      const result = await apiClient.get('/api/v1/agents/runtimes');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/AgentRuntimesResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('Agent Runtime Detail Endpoint', () => {
    it('should return runtime detail for a deployed agent', async () => {
      const result = await apiClient.get(
        '/api/v1/agents/runtimes/agent-ops-demo/sample-support-agent',
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/AgentRuntimeDetailResponse/content/application/json/schema',
        status: 200,
      });
    });
  });
});
