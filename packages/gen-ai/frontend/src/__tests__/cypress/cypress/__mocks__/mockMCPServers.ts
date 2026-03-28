/* eslint-disable camelcase */

/**
 * MCP Server mock that matches the real API structure (MCPServerFromAPI)
 * Note: Does NOT include 'id' field - that's added by transformMCPServerData in the frontend
 * Note: Status accepts any string for test flexibility, but defaults to API-compliant values
 */
export type MCPServerMock = {
  name: string;
  url: string;
  transport: 'sse' | 'streamable-http';
  description: string;
  logo: string | null;
  status: string; // In real API: 'healthy' | 'error' | 'unknown', but tests may use other values
};

export type MCPServersData = {
  total_count: number;
  servers: MCPServerMock[];
};

export type MCPServersResponse = {
  data: MCPServersData;
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

export const mockMCPServers = (servers?: MCPServerMock[]): MCPServersResponse => {
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
    data: {
      total_count: serverList.length,
      servers: serverList,
    },
  };
};
