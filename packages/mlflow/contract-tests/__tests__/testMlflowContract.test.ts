/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('MLflow API Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
  });

  const apiSchema = loadOpenAPISchema('api/openapi/mlflow.yaml');

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const result = await apiClient.get('/healthcheck');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/HealthCheckResponse/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('User Endpoint', () => {
    it('should retrieve current user information', async () => {
      const result = await apiClient.get('/api/v1/user');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ConfigResponse/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('Namespaces Endpoint', () => {
    it('should successfully retrieve namespaces list', async () => {
      const result = await apiClient.get('/api/v1/namespaces');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NamespacesResponse/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('Experiments Endpoint', () => {
    it('should successfully retrieve experiments list', async () => {
      const result = await apiClient.get('/api/v1/experiments?workspace=test-ns');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ExperimentsResponse/content/application~1json/schema',
        status: 200,
      });
    });
  });

  // --- Prompt Registry Endpoints ---

  describe('Prompt Registry', () => {
    const workspace = 'default';
    const promptsBase = '/api/v1/prompts';
    const promptUrl = (name?: string, suffix?: string) =>
      `${promptsBase}${name ? `/${name}` : ''}${suffix ?? ''}?workspace=${workspace}`;

    const promptName = `ct-prompt-${Date.now()}`;

    beforeAll(async () => {
      const setup = await apiClient.post(promptUrl(), {
        name: promptName,
        messages: [{ role: 'system', content: 'You are a helpful assistant.' }],
        // eslint-disable-next-line camelcase
        commit_message: 'initial version',
      });
      expect(setup.success).toBe(true);
    });

    afterAll(async () => {
      await apiClient.delete(promptUrl(promptName)).catch(() => undefined);
    });

    it('should list registered prompts with scope annotation', async () => {
      const result = await apiClient.get(promptUrl());
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/PromptsResponse/content/application~1json/schema',
        status: 200,
      });
      expect(result.success).toBe(true);

      const envelope = result.response?.data as {
        data?: { prompts?: Array<{ scope?: { type: string } }> };
      };
      const prompts = envelope.data?.prompts ?? [];
      expect(prompts.length).toBeGreaterThan(0);

      const hasProjectScope = prompts.some((p) => p.scope?.type === 'project');
      const hasGlobalScope = prompts.some((p) => p.scope?.type === 'global');
      expect(hasProjectScope).toBe(true);
      expect(hasGlobalScope).toBe(true);
    });

    it('should register a new prompt', async () => {
      const registerName = `ct-register-${Date.now()}`;
      const result = await apiClient.post(promptUrl(), {
        name: registerName,
        messages: [{ role: 'user', content: 'Hello' }],
        // eslint-disable-next-line camelcase
        commit_message: 'test registration',
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/PromptVersionResponse/content/application~1json/schema',
        status: 201,
      });
      await apiClient.delete(promptUrl(registerName)).catch(() => undefined);
    });

    it('should load a prompt by name', async () => {
      const result = await apiClient.get(promptUrl(promptName));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/PromptVersionResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should list versions of a prompt', async () => {
      const result = await apiClient.get(promptUrl(promptName, '/versions'));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/PromptVersionsResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should delete a specific prompt version', async () => {
      const deleteName = `ct-delver-${Date.now()}`;
      const setup = await apiClient.post(promptUrl(), {
        name: deleteName,
        template: 'to be deleted',
        // eslint-disable-next-line camelcase
        commit_message: 'will delete version',
      });
      expect(setup.success).toBe(true);
      const result = await apiClient.delete(promptUrl(deleteName, '/versions/1'));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NoContent',
        status: 204,
      });
      await apiClient.delete(promptUrl(deleteName)).catch(() => undefined);
    });

    it('should delete an entire prompt', async () => {
      const deleteName = `ct-delprompt-${Date.now()}`;
      const setup = await apiClient.post(promptUrl(), {
        name: deleteName,
        template: 'to be deleted',
        // eslint-disable-next-line camelcase
        commit_message: 'will delete prompt',
      });
      expect(setup.success).toBe(true);
      const result = await apiClient.delete(promptUrl(deleteName));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NoContent',
        status: 204,
      });
    });

    it('should return 400 when registering a prompt with invalid name', async () => {
      const result = await apiClient.post(promptUrl(), {
        name: '/invalid/name',
        template: 'Hello',
        // eslint-disable-next-line camelcase
        commit_message: 'test',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });

    it('should return 400 when registering a prompt without content', async () => {
      const result = await apiClient.post(promptUrl(), {
        name: 'valid-name',
        // eslint-disable-next-line camelcase
        commit_message: 'test',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });

    it('should return 400 when loading a prompt with invalid version', async () => {
      const result = await apiClient.get(`${promptUrl(promptName)}&version=notanumber`);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });

    it('should return 400 when loading a prompt with non-positive version', async () => {
      const result = await apiClient.get(`${promptUrl(promptName)}&version=0`);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });
  });

  // --- MCP Registry Endpoints ---

  describe('MCP Registry', () => {
    const workspace = 'default';
    const mcpBase = '/api/v1/mcp-registry/servers';
    const serverUrl = (name?: string, suffix?: string) =>
      `${mcpBase}${name ? `/${name}` : ''}${suffix ?? ''}?workspace=${workspace}`;

    // MCP server names must be "<namespace>/<slug>" (exactly one "/"), per
    // upstream MLflow's validate_mcp_server_name.
    const serverName = `ct.example/mcp-server-${Date.now()}`;
    const serverVersion = '1.0.0';
    let endpointId = '';

    it('should search MCP servers', async () => {
      const result = await apiClient.get(serverUrl());
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/MCPServersResponse/content/application~1json/schema',
        status: 200,
      });
      expect(result.success).toBe(true);
    });

    it('should create an MCP server', async () => {
      const result = await apiClient.post(serverUrl(), {
        name: serverName,
        description: 'Contract test server',
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/MCPServerResponse/content/application~1json/schema',
        status: 201,
      });
      expect(result.success).toBe(true);
    });

    it('should get an MCP server by name', async () => {
      const result = await apiClient.get(serverUrl(serverName));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/MCPServerResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should update an MCP server', async () => {
      const result = await apiClient.patch(serverUrl(serverName), {
        // eslint-disable-next-line camelcase
        display_name: 'Updated Contract Test Server',
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/MCPServerResponse/content/application~1json/schema',
        status: 200,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const envelope = result.response.data as { data?: { display_name?: string } };
        expect(envelope.data?.display_name).toBe('Updated Contract Test Server');
      }
    });

    it('should list versions of an MCP server', async () => {
      const result = await apiClient.get(serverUrl(serverName, '/versions'));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/MCPServerVersionsResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should create a new version of an MCP server', async () => {
      const result = await apiClient.post(serverUrl(serverName, '/versions'), {
        // eslint-disable-next-line camelcase
        server_json: { name: serverName, version: serverVersion },
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/MCPServerVersionResponse/content/application~1json/schema',
        status: 201,
      });
    });

    it('should get a specific MCP server version', async () => {
      const result = await apiClient.get(serverUrl(serverName, `/versions/${serverVersion}`));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/MCPServerVersionResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should update a specific MCP server version', async () => {
      const result = await apiClient.patch(serverUrl(serverName, `/versions/${serverVersion}`), {
        status: 'active',
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/MCPServerVersionResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should set a tag on an MCP server', async () => {
      const result = await apiClient.post(serverUrl(serverName, '/tags'), {
        key: 'category',
        value: 'weather',
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NoContent',
        status: 204,
      });
    });

    it('should set a tag on a specific MCP server version', async () => {
      const result = await apiClient.post(
        serverUrl(serverName, `/versions/${serverVersion}/tags`),
        {
          key: 'stability',
          value: 'stable',
        },
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NoContent',
        status: 204,
      });
    });

    // "latest" is a reserved alias name on the real MLflow server (used for
    // automatic resolution to the newest version), so contract tests use a
    // different alias to exercise user-settable aliases.
    const aliasName = 'stable';

    it('should set an alias on an MCP server', async () => {
      const result = await apiClient.post(serverUrl(serverName, '/aliases'), {
        alias: aliasName,
        version: serverVersion,
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NoContent',
        status: 204,
      });
    });

    it('should get an MCP server version by alias', async () => {
      const result = await apiClient.get(serverUrl(serverName, `/aliases/${aliasName}`));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/MCPServerVersionResponse/content/application~1json/schema',
        status: 200,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const envelope = result.response.data as { data?: { version?: string } };
        expect(envelope.data?.version).toBe(serverVersion);
      }
    });

    it('should create an access endpoint for an MCP server', async () => {
      const result = await apiClient.post(serverUrl(serverName, '/endpoints'), {
        // eslint-disable-next-line camelcase
        endpoint_url: 'https://mcp.example.com/contract-test',
        // eslint-disable-next-line camelcase
        transport_type: 'streamable-http',
        // eslint-disable-next-line camelcase
        server_version: serverVersion,
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/MCPAccessEndpointResponse/content/application~1json/schema',
        status: 201,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const envelope = result.response.data as { data?: { id?: string } };
        endpointId = envelope.data?.id ?? '';
        expect(endpointId).not.toBe('');
      }
    });

    it('should search access endpoints for an MCP server', async () => {
      const result = await apiClient.get(serverUrl(serverName, '/endpoints'));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/MCPAccessEndpointsResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should get an access endpoint by id', async () => {
      expect(endpointId).not.toBe('');
      const result = await apiClient.get(serverUrl(serverName, `/endpoints/${endpointId}`));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/MCPAccessEndpointResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should update an access endpoint', async () => {
      expect(endpointId).not.toBe('');
      const result = await apiClient.patch(serverUrl(serverName, `/endpoints/${endpointId}`), {
        // eslint-disable-next-line camelcase
        endpoint_url: 'https://mcp.example.com/contract-test-updated',
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/MCPAccessEndpointResponse/content/application~1json/schema',
        status: 200,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const envelope = result.response.data as { data?: { endpoint_url?: string } };
        expect(envelope.data?.endpoint_url).toBe('https://mcp.example.com/contract-test-updated');
      }
    });

    it('should delete an access endpoint from an MCP server', async () => {
      expect(endpointId).not.toBe('');
      const result = await apiClient.delete(serverUrl(serverName, `/endpoints/${endpointId}`));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NoContent',
        status: 204,
      });
    });

    it('should delete a tag from a specific MCP server version', async () => {
      const result = await apiClient.delete(
        serverUrl(serverName, `/versions/${serverVersion}/tags/stability`),
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NoContent',
        status: 204,
      });
    });

    it('should delete a tag from an MCP server', async () => {
      const result = await apiClient.delete(serverUrl(serverName, '/tags/category'));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NoContent',
        status: 204,
      });
    });

    it('should delete an alias from an MCP server', async () => {
      const result = await apiClient.delete(serverUrl(serverName, `/aliases/${aliasName}`));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NoContent',
        status: 204,
      });
    });

    it('should deprecate a specific MCP server version before deletion', async () => {
      // The real MLflow server only allows ACTIVE -> DEPRECATED -> DELETED
      // status transitions (not ACTIVE -> DELETED directly), matching
      // mlflow/entities/mcp_server.py's VALID_STATUS_TRANSITIONS.
      const result = await apiClient.patch(serverUrl(serverName, `/versions/${serverVersion}`), {
        status: 'deprecated',
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/MCPServerVersionResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should delete a specific MCP server version', async () => {
      const result = await apiClient.delete(serverUrl(serverName, `/versions/${serverVersion}`));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NoContent',
        status: 204,
      });
    });

    it('should delete an MCP server', async () => {
      const result = await apiClient.delete(serverUrl(serverName));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NoContent',
        status: 204,
      });
    });

    it('should return 400 when creating an MCP server with an invalid name', async () => {
      const result = await apiClient.post(serverUrl(), {
        name: '/invalid/name',
        description: 'invalid',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });

    it('should return 400 when creating a server version without server_json', async () => {
      const result = await apiClient.post(serverUrl(serverName, '/versions'), {
        status: 'draft',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });

    it('should return 400 when creating an access endpoint with both server_version and server_alias', async () => {
      const result = await apiClient.post(serverUrl(serverName, '/endpoints'), {
        // eslint-disable-next-line camelcase
        endpoint_url: 'https://mcp.example.com/contract-test',
        // eslint-disable-next-line camelcase
        server_version: '1.0.0',
        // eslint-disable-next-line camelcase
        server_alias: 'latest',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });

    it('should return 400 when updating an access endpoint with both server_version and server_alias', async () => {
      expect(endpointId).not.toBe('');
      const result = await apiClient.patch(serverUrl(serverName, `/endpoints/${endpointId}`), {
        // eslint-disable-next-line camelcase
        server_version: '1.0.0',
        // eslint-disable-next-line camelcase
        server_alias: 'latest',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });

    it('should return 400 when setting a server tag without a key', async () => {
      const result = await apiClient.post(serverUrl(serverName, '/tags'), {
        value: 'weather',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });

    it('should return 400 when setting an alias without a version', async () => {
      const result = await apiClient.post(serverUrl(serverName, '/aliases'), {
        alias: 'some-alias',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });

    it('should return 400 when setting the reserved alias "latest"', async () => {
      const result = await apiClient.post(serverUrl(serverName, '/aliases'), {
        alias: 'latest',
        version: serverVersion,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });
  });
});
