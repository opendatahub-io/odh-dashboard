/* eslint-disable camelcase */

/**
 * MCP Server mock that matches the real API structure (MCPServerFromAPI)
 * Note: Does NOT include 'id' field - that's added by transformMCPServerData in the frontend
 */
export type MCPServerMock = {
  name: string;
  url: string;
  transport: 'sse' | 'streamable-http';
  description: string;
  logo: string | null;
  status: 'healthy' | 'error' | 'unknown';
};

export type MCPConfigMapInfo = {
  name: string;
  namespace: string;
  last_updated: string;
};

export type MCPServersResponse = {
  servers: MCPServerMock[];
  total_count: number;
  config_map_info: MCPConfigMapInfo;
};

export const mockMCPServer = ({
  name = 'Test-MCP-Server',
  url = 'http://test-mcp-server.test.svc.cluster.local:8080/sse',
  transport = 'sse',
  description = 'Test MCP server',
  logo = null,
  status = 'healthy',
}: Partial<MCPServerMock> = {}): MCPServerMock => ({
  name,
  url,
  transport,
  description,
  logo,
  status,
});

export const mockMCPServers = (
  servers?: MCPServerMock[],
  namespace = 'test-namespace',
): MCPServersResponse => {
  const serverList = servers ?? [
    mockMCPServer({
      name: 'GitHub-MCP-Server',
      url: 'http://github-mcp-server.crimson-show.svc.cluster.local:8080/sse',
      status: 'unknown',
      description: 'MCP server for GitHub integration',
    }),
    mockMCPServer({
      name: 'Kubernetes-MCP-Server',
      url: 'http://kubernetes-mcp-server.crimson-show.svc.cluster.local:8080/sse',
      status: 'healthy',
      description: 'MCP server for Kubernetes cluster access',
    }),
  ];

  return {
    servers: serverList,
    total_count: serverList.length,
    config_map_info: {
      name: 'mcp-servers',
      namespace,
      last_updated: new Date().toISOString(),
    },
  };
};
