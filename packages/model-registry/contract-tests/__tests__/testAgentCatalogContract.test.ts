/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('Agent catalog', () => {
  it('has no tests', async () => {
    expect(true);
  });

  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });
  const openApiPath = process.env.CONTRACT_OPENAPI_PATH || 'upstream/api/openapi/mod-arch.yaml';
  const apiSchema = loadOpenAPISchema(openApiPath, 'components');
  const namespaceQuery = '?namespace=kubeflow';

  // BLOCKED(upstream): Awaiting upstream OpenAPI change to use BFF envelope responses
  // https://github.com/kubeflow/hub/blob/main/clients/ui/api/openapi/mod-arch.yaml
  //
  //
  // const getResponseData = (result: Awaited<ReturnType<typeof apiClient.get>>) => {
  //   expect(result.success).toBe(true);
  //   if (!result.success) {
  //     throw new Error(result.error.message);
  //   }
  //   return result.response.data;
  // };
  //
  // // Validate the full response: agent schemas currently omit the BFF data envelope.
  // it('returns the agent list in the BFF response envelope', async () => {
  //   const result = await apiClient.get(`/api/v1/agent_catalog/agents${namespaceQuery}`);
  //   expect(result).toMatchContract(apiSchema, {
  //     ref: '#/components/responses/AgentListResponse/content/application~1json/schema',
  //     status: 200,
  //   });
  //   expect(getResponseData(result)).toMatchObject({
  //     data: {
  //       items: expect.arrayContaining([
  //         expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
  //       ]),
  //       size: expect.any(Number),
  //       pageSize: expect.any(Number),
  //       nextPageToken: expect.any(String),
  //     },
  //   });
  // });
  //
  // it('returns agent filter metadata in the BFF response envelope', async () => {
  //   const result = await apiClient.get(
  //     `/api/v1/agent_catalog/agents_filter_options${namespaceQuery}`,
  //   );
  //   expect(result).toMatchContract(apiSchema, {
  //     ref: '#/components/responses/AgentFilterOptionsResponse/content/application~1json/schema',
  //     status: 200,
  //   });
  //   expect(getResponseData(result)).toMatchObject({
  //     data: { filters: expect.any(Object) },
  //   });
  // });
  //
  // it('returns an agent detail in the BFF response envelope', async () => {
  //   const result = await apiClient.get(`/api/v1/agent_catalog/agents/1${namespaceQuery}`);
  //   expect(result).toMatchContract(apiSchema, {
  //     ref: '#/components/responses/AgentResponse/content/application~1json/schema',
  //     status: 200,
  //   });
  //   expect(getResponseData(result)).toMatchObject({
  //     data: { id: '1', name: expect.any(String) },
  //   });
  // });
  //
  // it('returns agent artifacts in the BFF response envelope', async () => {
  //   const result = await apiClient.get(`/api/v1/agent_catalog/agents/1/artifacts${namespaceQuery}`);
  //   expect(result).toMatchContract(apiSchema, {
  //     ref: '#/components/responses/AgentArtifactListResponse/content/application~1json/schema',
  //     status: 200,
  //   });
  //   expect(getResponseData(result)).toMatchObject({
  //     data: {
  //       items: expect.arrayContaining([
  //         expect.objectContaining({
  //           artifactType: 'template-artifact',
  //           content: expect.any(String),
  //         }),
  //       ]),
  //       size: expect.any(Number),
  //       pageSize: expect.any(Number),
  //       nextPageToken: expect.any(String),
  //     },
  //   });
  // });
  //
  it('returns not found for a deterministically absent agent', async () => {
    const result = await apiClient.get(
      `/api/v1/agent_catalog/agents/contract-missing${namespaceQuery}`,
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchContract(apiSchema, {
        ref: '#/components/responses/NotFound/content/application~1json/schema',
        status: 404,
      });
      expect(result.error.data).toMatchObject({
        error: { code: expect.any(String), message: expect.any(String) },
      });
    }
  });
});
