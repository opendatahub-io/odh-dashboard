/* eslint-disable camelcase */

/**
 * MCPServer type matching MCPServerFromAPI from ~/app/types/mcp.ts
 */
export type MCPServer = {
  name: string;
  url: string;
  transport: 'sse' | 'streamable-http';
  description: string;
  logo: string | null;
  status: 'healthy' | 'error' | 'unknown';
  source?: 'registry' | 'configmap';
};

export type MCPConfigMapInfo = {
  name: string;
  namespace: string;
  last_updated: string;
};

export type MCPServersData = {
  servers: MCPServer[];
  total_count: number;
  config_map_info: MCPConfigMapInfo;
  registry_available?: boolean;
  configmap_available?: boolean;
};

// The API returns data wrapped in { data: ... } which modArchRestGET unwraps
export type MCPServersResponse = {
  data: MCPServersData;
};

export const mockMCPServer = ({
  name = 'Test-MCP-Server',
  url = 'http://test-mcp-server.test.svc.cluster.local:8080/sse',
  transport = 'sse',
  status = 'healthy',
  description = 'Test MCP server',
  logo = null,
  source,
}: Partial<MCPServer> = {}): MCPServer => ({
  name,
  url,
  transport,
  description,
  logo,
  status,
  ...(source !== undefined && { source }),
});

export const mockMCPServers = (servers?: MCPServer[]): MCPServersResponse => {
  const serverList = servers ?? [
    mockMCPServer({
      name: 'GitHub-MCP-Server',
      url: 'http://github-mcp-server.crimson-show.svc.cluster.local:8080/sse',
      transport: 'sse',
      status: 'unknown',
      description: 'MCP server for GitHub integration',
      logo: null,
    }),
    mockMCPServer({
      name: 'Kubernetes-MCP-Server',
      url: 'http://kubernetes-mcp-server.crimson-show.svc.cluster.local:8080/sse',
      transport: 'sse',
      status: 'healthy',
      description: 'MCP server for Kubernetes cluster access',
      logo: null,
    }),
  ];

  return {
    data: {
      servers: serverList,
      total_count: serverList.length,
      config_map_info: {
        name: 'mcp-servers-config',
        namespace: 'crimson-show',
        last_updated: new Date().toISOString(),
      },
    },
  };
};

export const mockMCPServersWithRegistry = (
  registryServers?: MCPServer[],
  configmapServers?: MCPServer[],
): MCPServersResponse => {
  const regServers = registryServers ?? [
    mockMCPServer({
      name: 'Registry-MCP-Server',
      url: 'http://registry-mcp-server.test.svc.cluster.local:8080/mcp',
      transport: 'streamable-http',
      status: 'healthy',
      description: 'MCP server from registry',
      source: 'registry',
    }),
  ];
  const cmServers = configmapServers ?? [
    mockMCPServer({
      name: 'ConfigMap-MCP-Server',
      url: 'http://configmap-mcp-server.test.svc.cluster.local:8080/sse',
      transport: 'sse',
      status: 'healthy',
      description: 'MCP server from configmap',
      source: 'configmap',
    }),
  ];
  const allServers = [...regServers, ...cmServers];
  return {
    data: {
      servers: allServers,
      total_count: allServers.length,
      config_map_info: {
        name: 'mcp-servers-config',
        namespace: 'crimson-show',
        last_updated: new Date().toISOString(),
      },
      registry_available: true,
      configmap_available: true,
    },
  };
};
