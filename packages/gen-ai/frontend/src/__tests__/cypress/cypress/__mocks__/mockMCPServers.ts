/* eslint-disable camelcase */
export type MCPServer = {
  name: string;
  url: string;
  status: string;
  description?: string;
};

export type MCPServersData = {
  total_count: number;
  servers: MCPServer[];
};

export type MCPServersResponse = {
  data: MCPServersData;
};

export const mockMCPServer = ({
  name = 'Test-MCP-Server',
  url = 'http://test-mcp-server.test.svc.cluster.local:8080/sse',
  status = 'Ready',
  description = 'Test MCP server',
}: Partial<MCPServer> = {}): MCPServer => ({
  name,
  url,
  status,
  description,
});

export const mockMCPServers = (servers?: MCPServer[]): MCPServersResponse => {
  const serverList = servers ?? [
    mockMCPServer({
      name: 'GitHub-MCP-Server',
      url: 'http://github-mcp-server.crimson-show.svc.cluster.local:8080/sse',
      status: 'Token required',
      description: 'MCP server for GitHub integration',
    }),
    mockMCPServer({
      name: 'Kubernetes-MCP-Server',
      url: 'http://kubernetes-mcp-server.crimson-show.svc.cluster.local:8080/sse',
      status: 'Ready',
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
