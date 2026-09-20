import type {
  McpDeploySpec,
  McpServer,
  McpServerJson,
  McpTool,
  McpToolList,
} from '~/app/types/mcpCatalogTypes';

export const mockMcpServerJson = (partial?: Partial<McpServerJson>): McpServerJson => ({
  name: 'kubernetes/mcp-server',
  version: '1.0.0',
  ...partial,
});

export const mockMcpServer = (partial?: Partial<McpServer>): McpServer => ({
  id: '1',
  name: 'kubernetes/mcp-server',
  displayName: 'Kubernetes MCP',
  toolCount: 0,
  repositoryUrl: 'https://github.com/kubernetes/mcp-server',
  serverJson: mockMcpServerJson(),
  ...partial,
});

export const mockMcpTool = (partial?: Partial<McpTool>): McpTool => ({
  name: 'test_tool',
  accessType: 'read_only',
  ...partial,
});

export const mockMcpToolList = (partial?: Partial<McpToolList>): McpToolList => ({
  items: [],
  size: 0,
  pageSize: 0,
  nextPageToken: '',
  ...partial,
});

export const mockMcpDeploySpec = (partial?: Partial<McpDeploySpec>): McpDeploySpec => ({
  source: { type: 'containerImage', containerImage: { ref: 'quay.io/example:1' } },
  config: { port: 8080 },
  ...partial,
});
