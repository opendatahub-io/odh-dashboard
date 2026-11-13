/**
 * @jest-environment node
 */
import { randomUUID } from 'crypto';
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('Source settings and preview', () => {
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
  const modelSourcesPath = '/api/v1/settings/model_catalog/source_configs';
  const mcpSourcesPath = '/api/v1/settings/mcp_catalog/source_configs';
  const ownedSources = new Set<string>();

  const getResponseData = (result: Awaited<ReturnType<typeof apiClient.get>>) => {
    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.response.data;
  };

  afterAll(async () => {
    const results = [];
    for (const path of ownedSources) {
      // Handler returns 200, not the documented 204. Do not count cleanup as coverage.
      results.push(await apiClient.delete(`${path}${namespaceQuery}`));
    }
    for (const result of results) {
      expect(result.success).toBe(true);
      if (result.success) expect(result.response.status).toBe(200);
    }
  });

  it('lists model source configurations', async () => {
    const result = await apiClient.get(`${modelSourcesPath}${namespaceQuery}`);
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogSourceConfigListResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        catalogs: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            type: expect.any(String),
          }),
        ]),
      },
    });
  });

  it('returns a model source configuration', async () => {
    const result = await apiClient.get(`${modelSourcesPath}/custom_yaml_models${namespaceQuery}`);
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogSourceConfigResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        id: expect.any(String),
        name: expect.any(String),
        type: expect.any(String),
        enabled: expect.any(Boolean),
      },
    });
  });

  it('creates a test-owned model source configuration', async () => {
    const id = `contract_${randomUUID().replace(/-/g, '_')}`;
    const result = await apiClient.post(`${modelSourcesPath}${namespaceQuery}`, {
      data: {
        id,
        name: 'Contract model source',
        type: 'yaml',
        enabled: true,
        labels: ['Contract tests'],
        yaml: 'models: []',
      },
    });
    if (result.success) ownedSources.add(`${modelSourcesPath}/${id}`);
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogSourceConfigResponse/content/application~1json/schema',
      status: 201,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        id: expect.any(String),
        name: expect.any(String),
        type: expect.any(String),
        enabled: expect.any(Boolean),
        isDefault: expect.any(Boolean),
      },
    });
  });

  it('updates only a test-owned model source configuration', async () => {
    const id = `contract_${randomUUID().replace(/-/g, '_')}`;
    const setup = await apiClient.post(`${modelSourcesPath}${namespaceQuery}`, {
      data: {
        id,
        name: 'Contract patch source',
        type: 'yaml',
        enabled: true,
        labels: ['Contract tests'],
        yaml: 'models: []',
      },
    });
    if (setup.success) ownedSources.add(`${modelSourcesPath}/${id}`);
    expect(setup.response?.status).toBe(201);
    getResponseData(setup);
    const result = await apiClient.patch(`${modelSourcesPath}/${id}${namespaceQuery}`, {
      data: { enabled: false },
    });
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogSourceConfigResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        id: expect.any(String),
        name: expect.any(String),
        type: expect.any(String),
        enabled: expect.any(Boolean),
      },
    });
  });

  it('lists MCP source configurations', async () => {
    const result = await apiClient.get(`${mcpSourcesPath}${namespaceQuery}`);
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/McpCatalogSourceConfigListResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        catalogs: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            type: expect.any(String),
          }),
        ]),
      },
    });
  });

  it('returns an MCP source configuration', async () => {
    const result = await apiClient.get(`${mcpSourcesPath}/community_mcp_servers${namespaceQuery}`);
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/McpCatalogSourceConfigResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        id: expect.any(String),
        name: expect.any(String),
        type: expect.any(String),
        isDefault: expect.any(Boolean),
      },
    });
  });

  it('creates a test-owned MCP source configuration', async () => {
    const id = `contract_${randomUUID().replace(/-/g, '_')}`;
    const result = await apiClient.post(`${mcpSourcesPath}${namespaceQuery}`, {
      data: {
        id,
        name: 'Contract MCP source',
        type: 'yaml',
        enabled: true,
        labels: ['Contract tests'],
        yaml: 'servers: []',
      },
    });
    if (result.success) ownedSources.add(`${mcpSourcesPath}/${id}`);
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/McpCatalogSourceConfigResponse/content/application~1json/schema',
      status: 201,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        id: expect.any(String),
        name: expect.any(String),
        type: expect.any(String),
        enabled: expect.any(Boolean),
        isDefault: expect.any(Boolean),
      },
    });
  });

  it('updates only a test-owned MCP source configuration', async () => {
    const id = `contract_${randomUUID().replace(/-/g, '_')}`;
    const setup = await apiClient.post(`${mcpSourcesPath}${namespaceQuery}`, {
      data: {
        id,
        name: 'Contract patch MCP',
        type: 'yaml',
        enabled: true,
        labels: ['Contract tests'],
        yaml: 'servers: []',
      },
    });
    if (setup.success) ownedSources.add(`${mcpSourcesPath}/${id}`);
    expect(setup.response?.status).toBe(201);
    getResponseData(setup);
    const result = await apiClient.patch(`${mcpSourcesPath}/${id}${namespaceQuery}`, {
      data: { enabled: false },
    });
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/McpCatalogSourceConfigResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        id: expect.any(String),
        name: expect.any(String),
        type: expect.any(String),
        enabled: expect.any(Boolean),
      },
    });
  });

  it('previews model inclusion with model-count summary fields', async () => {
    const result = await apiClient.post(
      `/api/v1/settings/model_catalog/source_preview${namespaceQuery}`,
      {
        data: {
          type: 'yaml',
          includedModels: [],
          excludedModels: [],
          properties: { yaml: 'models:\n  - name: test-model' },
        },
      },
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogSourcePreviewResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        ...pagination,
        summary: {
          totalModels: expect.any(Number),
          includedModels: expect.any(Number),
          excludedModels: expect.any(Number),
        },
        items: expect.arrayContaining([
          expect.objectContaining({ name: expect.any(String), included: expect.any(Boolean) }),
        ]),
      },
    });
  });

  it('previews MCP inclusion on the model preview route with asset-count fields', async () => {
    const result = await apiClient.post(
      `/api/v1/settings/model_catalog/source_preview${namespaceQuery}&assetType=mcp_servers`,
      {
        data: {
          type: 'yaml',
          includedServers: ['*'],
          excludedServers: [],
          properties: { yaml: 'mcp_servers:\n  - name: test-server' },
        },
      },
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogSourcePreviewResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        ...pagination,
        summary: {
          totalAssets: expect.any(Number),
          includedAssets: expect.any(Number),
          excludedAssets: expect.any(Number),
        },
        items: expect.arrayContaining([
          expect.objectContaining({ name: expect.any(String), included: expect.any(Boolean) }),
        ]),
      },
    });
  });

  it('returns not found for an absent source configuration', async () => {
    const result = await apiClient.get(
      `${modelSourcesPath}/contract-missing-source${namespaceQuery}`,
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

  it('rejects malformed JSON for MCP source creation', async () => {
    const result = await apiClient.post(`${mcpSourcesPath}${namespaceQuery}`, '{"data":');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchContract(apiSchema, {
        ref: '#/components/responses/BadRequest/content/application~1json/schema',
        status: 400,
      });
      expect(result.error.data).toMatchObject({
        error: { code: expect.any(String), message: expect.any(String) },
      });
    }
  });

  // BLOCKED (upstream): DELETE model source configuration is documented as 204 but returns
  // a 200 JSON envelope. Existing afterAll deletion is cleanup, not success-contract coverage.
  // it('deletes a test-owned model source configuration with a bodyless 204', async () => {
  //   const id = `contract_${randomUUID().replace(/-/g, '_')}`;
  //   const setup = await apiClient.post(`${modelSourcesPath}${namespaceQuery}`, {
  //     data: { id, name: 'Contract delete source', type: 'yaml', enabled: true, yaml: 'models: []' },
  //   });
  //   const path = `${modelSourcesPath}/${id}`;
  //   if (setup.success) ownedSources.add(path);
  //   expect(setup.response?.status).toBe(201);
  //   getResponseData(setup);
  //   const result = await apiClient.delete(`${path}${namespaceQuery}`);
  //   expect(result.success).toBe(true);
  //   if (result.success) {
  //     ownedSources.delete(path);
  //     expect(result.response.status).toBe(204);
  //     expect(result.response.data).toBe('');
  //   }
  // });

  // BLOCKED (upstream): MCP source configuration DELETE has the same 204/200 mismatch.
  // it('deletes a test-owned MCP source configuration with a bodyless 204', async () => {
  //   const id = `contract_${randomUUID().replace(/-/g, '_')}`;
  //   const setup = await apiClient.post(`${mcpSourcesPath}${namespaceQuery}`, {
  //     data: { id, name: 'Contract delete MCP source', type: 'yaml', enabled: true, yaml: 'servers: []' },
  //   });
  //   const path = `${mcpSourcesPath}/${id}`;
  //   if (setup.success) ownedSources.add(path);
  //   expect(setup.response?.status).toBe(201);
  //   getResponseData(setup);
  //   const result = await apiClient.delete(`${path}${namespaceQuery}`);
  //   expect(result.success).toBe(true);
  //   if (result.success) {
  //     ownedSources.delete(path);
  //     expect(result.response.status).toBe(204);
  //     expect(result.response.data).toBe('');
  //   }
  // });
});
