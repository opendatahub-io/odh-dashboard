/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('MCP catalog, conversion and deployment', () => {
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
  const pagination = {
    items: expect.any(Array),
    size: expect.any(Number),
    pageSize: expect.any(Number),
    nextPageToken: expect.any(String),
  };

  const getResponseData = (result: Awaited<ReturnType<typeof apiClient.get>>) => {
    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.response.data;
  };

  // MCP list/detail declare integer IDs but mocks return strings; logo needs a media contract.
  // MCP deployments/conversion require schema and downstream-profile prerequisites.
  it('returns MCP filter metadata', async () => {
    const result = await apiClient.get(
      `/api/v1/mcp_catalog/mcp_servers_filter_options${namespaceQuery}`,
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/McpServerFilterOptionsResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        filters: expect.any(Object),
      },
    });
  });

  it('returns MCP tool definitions from the canned tool fixture', async () => {
    // Mock ignores the requested server ID; this is a shape contract, not tool ownership.
    const result = await apiClient.get(`/api/v1/mcp_catalog/mcp_servers/1/tools${namespaceQuery}`);
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/McpServerToolListResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        ...pagination,
        items: expect.arrayContaining([
          expect.objectContaining({
            serverId: expect.any(String),
            tool: expect.objectContaining({
              name: expect.any(String),
              parameters: expect.any(Array),
            }),
          }),
        ]),
      },
    });
  });

  // BLOCKED (upstream): McpServer.id is declared integer, while Go models/mocks return strings.
  // it('lists catalog MCP servers with pagination metadata', async () => {
  //   const result = await apiClient.get(`/api/v1/mcp_catalog/mcp_servers${namespaceQuery}`);
  //   expect(result).toMatchContract(apiSchema, {
  //     ref: '#/components/responses/McpServerListResponse/content/application~1json/schema',
  //     status: 200,
  //   });
  //   expect(getResponseData(result)).toMatchObject({
  //     data: {
  //       ...pagination,
  //       items: expect.arrayContaining([
  //         expect.objectContaining({ id: '1', name: 'Prometheus MCP Server', toolCount: expect.any(Number) }),
  //       ]),
  //     },
  //   });
  // });

  // BLOCKED (upstream): same string/integer ID mismatch in McpServerResponse.
  // it('returns the seeded MCP server detail', async () => {
  //   const result = await apiClient.get(`/api/v1/mcp_catalog/mcp_servers/1${namespaceQuery}`);
  //   expect(result).toMatchContract(apiSchema, {
  //     ref: '#/components/responses/McpServerResponse/content/application~1json/schema',
  //     status: 200,
  //   });
  //   expect(getResponseData(result)).toMatchObject({
  //     data: {
  //       id: '1', name: 'Prometheus MCP Server',
  //       toolCount: expect.any(Number), transports: expect.any(Array),
  //     },
  //   });
  // });

  it('returns a structured not-found error for the deterministically missing MCP logo', async () => {
    const result = await apiClient.get(
      `/api/v1/mcp_catalog/mcp_servers/missing/logo${namespaceQuery}`,
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

  // BLOCKED (upstream/framework): logo 200 has no OpenAPI image media contract. The shared
  // client also needs byte responses and redirect control before this is a full binary contract.
  // Preserve the security headers when adding that support; do not validate SVG as JSON.
  // it('returns the MCP logo with SVG media type and protective headers', async () => {
  //   const result = await apiClient.get(`/api/v1/mcp_catalog/mcp_servers/1/logo${namespaceQuery}`);
  //   expect(result.success).toBe(true);
  //   if (result.success) {
  //     expect(result.response.status).toBe(200);
  //     expect(result.response.headers).toMatchObject({
  //       'content-type': expect.stringContaining('image/svg+xml'),
  //       'x-content-type-options': 'nosniff',
  //       'content-security-policy': expect.stringContaining('sandbox'),
  //     });
  //     // Replace the text assertion with exact byte/media validation once raw support exists.
  //     expect(result.response.data).toBe(
  //       '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>',
  //     );
  //   }
  // });
  // Redirect preservation additionally needs a deterministic redirect fixture and disabled
  // automatic redirect following in the shared client; the current logo mock only emits SVG/404.

  // BLOCKED (upstream): converter operation/schema is missing from OpenAPI. The Red Hat
  // converter override is active even with mocked Kubernetes, unlike deployment CRUD below.
  // Resolve this path pointer after the success contract has been documented.
  // it('converts a catalog MCP server to an MCPServer deployment resource', async () => {
  //   const result = await apiClient.get(`/api/v1/mcp_catalog/mcp_servers/1/mcpserver${namespaceQuery}`);
  //   expect(result).toMatchContract(apiSchema, {
  //     ref: '#/paths/~1api~1v1~1mcp_catalog~1mcp_servers~1{server}~1mcpserver/get/responses/200/content/application~1json/schema',
  //     status: 200,
  //   });
  //   expect(getResponseData(result)).toMatchObject({
  //     data: {
  //       apiVersion: expect.any(String), kind: 'MCPServer',
  //       metadata: { name: expect.any(String) },
  //       spec: {
  //         source: { type: 'ContainerImage', containerImage: { ref: expect.any(String) } },
  //         config: { port: expect.any(Number) },
  //       },
  //     },
  //   });
  // });

  describe('MCP deployment contracts pending a downstream test profile', () => {
    // BLOCKED (upstream/profile): all five operations lack OpenAPI schemas; the current
    // --mock-k8s-client profile disables their Red Hat overrides and returns 501.
    // They need a profile with MCPServer CRD support, RBAC, and deterministic fixtures.
    // The commented path references must be resolved to the eventual concrete response schemas.
    // Keep setup/cleanup disabled together with the tests; never mutate shared deployments.
    // const deploymentPath = '/api/v1/mcp_deployments';
    // const ownedDeployments = new Set<string>();
    // afterAll(async () => {
    //   for (const name of ownedDeployments) {
    //     const cleanup = await apiClient.delete(`${deploymentPath}/${name}${namespaceQuery}`);
    //     expect(cleanup.success).toBe(true);
    //     if (cleanup.success) expect(cleanup.response.status).toBe(204);
    //   }
    // });
    // Import randomUUID from crypto when enabling these drafts.
    //
    // it('lists MCP deployments including an independently created owned resource', async () => {
    //   const name = `contract-${randomUUID()}`;
    //   const setup = await apiClient.post(`${deploymentPath}${namespaceQuery}`, {
    //     data: { name, image: 'quay.io/mcp-servers/github:1.0.0' },
    //   });
    //   if (setup.success) ownedDeployments.add(name);
    //   expect(setup.response?.status).toBe(201);
    //   getResponseData(setup);
    //   const result = await apiClient.get(`${deploymentPath}${namespaceQuery}`);
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/paths/~1api~1v1~1mcp_deployments/get/responses/200/content/application~1json/schema',
    //     status: 200,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: {
    //       items: expect.arrayContaining([
    //         expect.objectContaining({ name, namespace: 'kubeflow', image: 'quay.io/mcp-servers/github:1.0.0' }),
    //       ]),
    //       size: expect.any(Number),
    //     },
    //   });
    // });
    //
    // it('creates a test-owned MCP deployment from the consumer request envelope', async () => {
    //   const name = `contract-${randomUUID()}`;
    //   const result = await apiClient.post(`${deploymentPath}${namespaceQuery}`, {
    //     data: { name, displayName: 'Contract MCP deployment', image: 'quay.io/mcp-servers/github:1.0.0' },
    //   });
    //   if (result.success) ownedDeployments.add(name);
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/paths/~1api~1v1~1mcp_deployments/post/responses/201/content/application~1json/schema',
    //     status: 201,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: { name, namespace: 'kubeflow', image: 'quay.io/mcp-servers/github:1.0.0', uid: expect.any(String) },
    //   });
    // });
    //
    // it('returns detail for an independently created owned MCP deployment', async () => {
    //   const name = `contract-${randomUUID()}`;
    //   const setup = await apiClient.post(`${deploymentPath}${namespaceQuery}`, {
    //     data: { name, image: 'quay.io/mcp-servers/github:1.0.0' },
    //   });
    //   if (setup.success) ownedDeployments.add(name);
    //   expect(setup.response?.status).toBe(201);
    //   getResponseData(setup);
    //   const result = await apiClient.get(`${deploymentPath}/${name}${namespaceQuery}`);
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/paths/~1api~1v1~1mcp_deployments~1{deployment}/get/responses/200/content/application~1json/schema',
    //     status: 200,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: {
    //       name, namespace: 'kubeflow', image: 'quay.io/mcp-servers/github:1.0.0',
    //       conditions: expect.any(Array), uid: expect.any(String),
    //     },
    //   });
    // });
    //
    // it('updates only a test-owned MCP deployment', async () => {
    //   const name = `contract-${randomUUID()}`;
    //   const setup = await apiClient.post(`${deploymentPath}${namespaceQuery}`, {
    //     data: { name, image: 'quay.io/mcp-servers/github:1.0.0' },
    //   });
    //   if (setup.success) ownedDeployments.add(name);
    //   expect(setup.response?.status).toBe(201);
    //   getResponseData(setup);
    //   const result = await apiClient.patch(`${deploymentPath}/${name}${namespaceQuery}`, {
    //     data: { image: 'quay.io/mcp-servers/github:2.0.0' },
    //   });
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/paths/~1api~1v1~1mcp_deployments~1{deployment}/patch/responses/200/content/application~1json/schema',
    //     status: 200,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: { name, namespace: 'kubeflow', image: 'quay.io/mcp-servers/github:2.0.0' },
    //   });
    // });
    //
    // it('deletes only a test-owned MCP deployment with a bodyless 204', async () => {
    //   const name = `contract-${randomUUID()}`;
    //   const setup = await apiClient.post(`${deploymentPath}${namespaceQuery}`, {
    //     data: { name, image: 'quay.io/mcp-servers/github:1.0.0' },
    //   });
    //   if (setup.success) ownedDeployments.add(name);
    //   expect(setup.response?.status).toBe(201);
    //   getResponseData(setup);
    //   const result = await apiClient.delete(`${deploymentPath}/${name}${namespaceQuery}`);
    //   expect(result.success).toBe(true);
    //   if (result.success) {
    //     ownedDeployments.delete(name);
    //     expect(result.response.status).toBe(204);
    //     expect(result.response.data).toBe('');
    //   }
    // });
  });
});
