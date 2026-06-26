/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('Agent Ops API Contract Tests', () => {
  const clusterMode = process.env.AGENT_OPS_CONTRACT_CLUSTER === 'true';
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: clusterMode
      ? { 'x-forwarded-access-token': 'contract-test-token' }
      : {
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
    (clusterMode ? describe : describe.skip)(
      'Success Cases (requires cluster-backed BFF; run test:contract:cluster)',
      () => {
        it('should return runtime detail for a deployed agent', async () => {
          const result = await apiClient.get(
            '/api/v1/agents/runtimes/agent-ops-demo/sample-support-agent',
          );
          expect(result).toMatchContract(apiSchema, {
            ref: '#/components/responses/AgentRuntimeDetailResponse/content/application/json/schema',
            status: 200,
          });
        });
      },
    );

    describe('Error Cases', () => {
      it('should return 404 for a missing agent', async () => {
        const result = await apiClient.get('/api/v1/agents/runtimes/agent-ops-demo/missing-agent');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });

      it('should return 400 for an invalid namespace', async () => {
        const result = await apiClient.get(
          '/api/v1/agents/runtimes/INVALID_NS/sample-support-agent',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });
    });
  });

  describe('Deploy Agent Endpoint', () => {
    it('should deploy an agent with minimal params', async () => {
      const result = await apiClient.post('/api/v1/agents/deploy', {
        name: 'contract-test-agent',
        namespace: 'default',
        containerImage: 'quay.io/example/agent',
        imageTag: 'latest',
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/DeployAgentResponse/content/application~1json/schema',
        status: 201,
      });
    });

    it('should return 400 for missing required fields', async () => {
      const result = await apiClient.post('/api/v1/agents/deploy', {
        name: 'bad-agent',
        namespace: 'default',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
      }
    });

    it('should return 400 for an invalid namespace', async () => {
      const result = await apiClient.post('/api/v1/agents/deploy', {
        name: 'bad-agent',
        namespace: 'INVALID_NS',
        containerImage: 'quay.io/example/agent',
        imageTag: 'latest',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
      }
    });

    it('should return 409 for duplicate deployment', async () => {
      const body = {
        name: 'dup-agent',
        namespace: 'default',
        containerImage: 'quay.io/example/agent',
        imageTag: 'latest',
      };
      const firstResult = await apiClient.post('/api/v1/agents/deploy', body);
      expect(firstResult.success).toBe(true);
      const result = await apiClient.post('/api/v1/agents/deploy', body);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(409);
      }
    });
  });
});
