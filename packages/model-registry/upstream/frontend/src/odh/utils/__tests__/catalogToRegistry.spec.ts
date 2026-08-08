import type { McpServer, McpTool } from '~/app/mcpServerCatalogTypes';
import type { MCPServerCR } from '~/odh/types/mcpDeploymentTypes';
import {
  RHAI_DEPLOY_SPEC_META_KEY,
  catalogToRegistryIcons,
  catalogToRegistryName,
  catalogToServerJson,
  catalogToolToRegistryTool,
} from '~/odh/utils/catalogToRegistry';

const makeServer = (partial?: Partial<McpServer>): McpServer => ({
  id: '1',
  name: 'Kubernetes MCP',
  toolCount: 0,
  ...partial,
});

const makeCR = (specOverrides: Partial<MCPServerCR['spec']> = {}): MCPServerCR => ({
  apiVersion: 'mcp.x-k8s.io/v1alpha1',
  kind: 'MCPServer',
  metadata: { name: 'test-server' },
  spec: {
    source: { type: 'containerImage', containerImage: { ref: 'ghcr.io/feiskyer/mcp:latest' } },
    config: { port: 3000, path: '/mcp', arguments: ['--http', '--port', '3000'] },
    runtime: { security: { serviceAccountName: 'mcp-kubernetes-sa' } },
    ...specOverrides,
  },
});

describe('catalogToRegistryName', () => {
  it('derives owner/repo from a GitHub repository URL', () => {
    const server = makeServer({
      repositoryUrl: 'https://github.com/feiskyer/mcp-kubernetes-server',
    });
    expect(catalogToRegistryName(server)).toBe('feiskyer/mcp-kubernetes-server');
  });

  it('keeps only the first two path segments for deeper URLs', () => {
    const server = makeServer({
      repositoryUrl: 'https://github.com/feiskyer/mcp-kubernetes-server/tree/main',
    });
    expect(catalogToRegistryName(server)).toBe('feiskyer/mcp-kubernetes-server');
  });

  it('falls back to sourceCode when repositoryUrl is absent', () => {
    const server = makeServer({ sourceCode: 'https://github.com/octo/widgets' });
    expect(catalogToRegistryName(server)).toBe('octo/widgets');
  });

  it('falls back to source_id/slug(name) when no parseable URL is present', () => {
    // eslint-disable-next-line camelcase
    const server = makeServer({ name: 'My Cool Server!', source_id: 'community' });
    expect(catalogToRegistryName(server)).toBe('community/my-cool-server');
  });

  it('falls back to catalog/slug(name) when source_id is also absent', () => {
    const server = makeServer({ name: 'Standalone Server' });
    expect(catalogToRegistryName(server)).toBe('catalog/standalone-server');
  });

  it('falls back for a single-segment URL path', () => {
    const server = makeServer({
      name: 'Solo',
      // eslint-disable-next-line camelcase
      source_id: 'community',
      repositoryUrl: 'https://example.com/',
    });
    expect(catalogToRegistryName(server)).toBe('community/solo');
  });

  it('falls back for an unparseable URL string', () => {
    const server = makeServer({
      name: 'Solo',
      // eslint-disable-next-line camelcase
      source_id: 'community',
      repositoryUrl: 'not a url',
    });
    expect(catalogToRegistryName(server)).toBe('community/solo');
  });

  it('does not collide on nested GitLab groups (falls back instead of using owner/repo)', () => {
    const serverA = makeServer({
      name: 'Project A',
      // eslint-disable-next-line camelcase
      source_id: 'community',
      repositoryUrl: 'https://gitlab.com/group/subgroup/project-a',
    });
    const serverB = makeServer({
      name: 'Project B',
      // eslint-disable-next-line camelcase
      source_id: 'community',
      repositoryUrl: 'https://gitlab.com/group/subgroup/project-b',
    });

    expect(catalogToRegistryName(serverA)).toBe('community/project-a');
    expect(catalogToRegistryName(serverB)).toBe('community/project-b');
  });
});

describe('catalogToolToRegistryTool', () => {
  it('converts flat parameters into a JSON Schema input_schema', () => {
    const tool: McpTool = {
      name: 'list_pods',
      description: 'List pods in a namespace',
      accessType: 'read_only',
      parameters: [
        { name: 'namespace', type: 'string', description: 'Target namespace', required: true },
        { name: 'labelSelector', type: 'string', required: false },
      ],
    };

    expect(catalogToolToRegistryTool(tool)).toEqual({
      name: 'list_pods',
      description: 'List pods in a namespace',
      // eslint-disable-next-line camelcase
      input_schema: {
        type: 'object',
        properties: {
          namespace: { type: 'string', description: 'Target namespace' },
          labelSelector: { type: 'string' },
        },
        required: ['namespace'],
      },
    });
  });

  it('omits required when no parameters are required', () => {
    const tool: McpTool = {
      name: 'ping',
      accessType: 'read_only',
      parameters: [{ name: 'timeout', type: 'number', required: false }],
    };

    const result = catalogToolToRegistryTool(tool);
    // eslint-disable-next-line camelcase
    expect(result.input_schema).toEqual({
      type: 'object',
      properties: { timeout: { type: 'number' } },
    });
  });

  it('handles tools with no parameters', () => {
    const tool: McpTool = { name: 'noop', accessType: 'read_only' };

    expect(catalogToolToRegistryTool(tool)).toEqual({
      name: 'noop',
      // eslint-disable-next-line camelcase
      input_schema: { type: 'object', properties: {} },
    });
  });
});

describe('catalogToRegistryIcons', () => {
  it('returns a single row from server.logo when it is an http(s) URL', () => {
    const server = makeServer({ logo: 'https://example.com/icon.svg' });
    expect(catalogToRegistryIcons(server)).toEqual([{ src: 'https://example.com/icon.svg' }]);
  });

  it('rewrites data-URI logos to the catalog logo endpoint URL', () => {
    const server = makeServer({
      id: 'kubernetes-server-1',
      logo: 'data:image/svg+xml;base64,PHN2Zy4uLjwvc3ZnPg==',
    });
    const result = catalogToRegistryIcons(server);
    expect(result).toHaveLength(1);
    expect(result[0].src).toMatch(
      /\/model-registry\/api\/v1\/mcp_catalog\/mcp_servers\/kubernetes-server-1\/logo$/,
    );
  });

  it('returns an empty array when server.logo is absent', () => {
    const server = makeServer();
    expect(catalogToRegistryIcons(server)).toEqual([]);
  });
});

describe('catalogToServerJson', () => {
  it('builds the base server.json shape without _meta when deploySpec is omitted', () => {
    const server = makeServer({
      description: 'Control and inspect Kubernetes clusters.',
      version: '1.2.0',
      documentationUrl: 'https://example.com/docs',
    });

    const result = catalogToServerJson(server, 'feiskyer/mcp-kubernetes-server', 'Kubernetes MCP');

    expect(result).toEqual({
      $schema: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
      name: 'feiskyer/mcp-kubernetes-server',
      description: 'Control and inspect Kubernetes clusters.',
      title: 'Kubernetes MCP',
      version: '1.2.0',
      websiteUrl: 'https://example.com/docs',
    });
    expect(result._meta).toBeUndefined();
  });

  it('defaults version to 1.0.0 when the catalog server has none', () => {
    const server = makeServer();
    const result = catalogToServerJson(server, 'catalog/my-server', '');
    expect(result.version).toBe('1.0.0');
  });

  it('includes remotes derived from http/sse endpoints', () => {
    const server = makeServer({
      endpoints: { http: 'https://example.com/mcp', sse: 'https://example.com/sse' },
    });
    const result = catalogToServerJson(server, 'catalog/my-server', 'My Server');

    expect(result.remotes).toEqual([
      { type: 'streamable-http', url: 'https://example.com/mcp' },
      { type: 'sse', url: 'https://example.com/sse' },
    ]);
  });

  it('omits remotes when there are no endpoints', () => {
    const server = makeServer();
    const result = catalogToServerJson(server, 'catalog/my-server', 'My Server');
    expect(result.remotes).toBeUndefined();
  });

  it('embeds deploySpec under the com.redhat/deploy-spec _meta key when provided', () => {
    const server = makeServer();
    const cr = makeCR();

    const result = catalogToServerJson(server, 'catalog/my-server', 'My Server', cr.spec);

    expect(RHAI_DEPLOY_SPEC_META_KEY).toBe('com.redhat/deploy-spec');
    expect(result._meta).toEqual({
      [RHAI_DEPLOY_SPEC_META_KEY]: cr.spec,
    });
    expect((result._meta as Record<string, unknown>)[RHAI_DEPLOY_SPEC_META_KEY]).toEqual({
      source: { type: 'containerImage', containerImage: { ref: 'ghcr.io/feiskyer/mcp:latest' } },
      config: { port: 3000, path: '/mcp', arguments: ['--http', '--port', '3000'] },
      runtime: { security: { serviceAccountName: 'mcp-kubernetes-sa' } },
    });
  });

  it('omits title when displayName is empty', () => {
    const server = makeServer();
    const result = catalogToServerJson(server, 'catalog/my-server', '');
    expect(result.title).toBeUndefined();
  });
});
