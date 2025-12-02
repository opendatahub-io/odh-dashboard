/* eslint-disable camelcase */
import { MCPServer, MCPToolsStatus } from '~/app/types';
import { MCPToolFromAPI } from '~/app/types/mcp';
import { useMCPServerTools } from '~/app/hooks/useMCPServerTools';

// Mock Server
export const mockServer: MCPServer = {
  id: 'server-1',
  name: 'Test Server',
  description: 'A test server',
  status: 'active',
  endpoint: 'View',
  connectionUrl: 'http://test-server.com',
  tools: 0,
  version: '1.0',
};

// Mock Tools
export const mockSingleTool: MCPToolFromAPI[] = [
  { name: 'test_tool', description: 'Test tool', input_schema: {} },
];

export const mockThreeTools: MCPToolFromAPI[] = [
  { name: 'tool1', description: 'Tool 1', input_schema: {} },
  { name: 'tool2', description: 'Tool 2', input_schema: {} },
  { name: 'tool3', description: 'Tool 3', input_schema: {} },
];

export const mockFourTools: MCPToolFromAPI[] = [
  { name: 'redis_get', description: 'Redis get', input_schema: {} },
  { name: 'redis_set', description: 'Redis set', input_schema: {} },
  { name: 'postgres_query', description: 'Postgres query', input_schema: {} },
  { name: 'postgres_insert', description: 'Postgres insert', input_schema: {} },
];

export const mockKubernetesTools: MCPToolFromAPI[] = [
  { name: 'kubernetes_pod_list', description: 'List pods', input_schema: {} },
  { name: 'kubernetes_pod_get', description: 'Get pod', input_schema: {} },
  { name: 'kubernetes_pod_create', description: 'Create pod', input_schema: {} },
  { name: 'kubernetes_pod_delete', description: 'Delete pod', input_schema: {} },
  { name: 'kubernetes_pod_logs', description: 'Get pod logs', input_schema: {} },
  { name: 'kubernetes_pod_exec', description: 'Execute in pod', input_schema: {} },
  { name: 'kubernetes_pod_watch', description: 'Watch pods', input_schema: {} },
  { name: 'kubernetes_pod_status', description: 'Pod status', input_schema: {} },
  { name: 'kubernetes_deployment_list', description: 'List deployments', input_schema: {} },
  { name: 'kubernetes_service_list', description: 'List services', input_schema: {} },
  { name: 'kubernetes_namespace_list', description: 'List namespaces', input_schema: {} },
  { name: 'kubernetes_configmap_list', description: 'List configmaps', input_schema: {} },
  { name: 'kubernetes_secret_list', description: 'List secrets', input_schema: {} },
  { name: 'kubernetes_node_list', description: 'List nodes', input_schema: {} },
  { name: 'kubernetes_ingress_list', description: 'List ingress', input_schema: {} },
  { name: 'kubernetes_pvc_list', description: 'List PVCs', input_schema: {} },
  { name: 'kubernetes_pv_list', description: 'List PVs', input_schema: {} },
  { name: 'kubernetes_job_list', description: 'List jobs', input_schema: {} },
  { name: 'kubernetes_cronjob_list', description: 'List cronjobs', input_schema: {} },
  { name: 'kubernetes_statefulset_list', description: 'List statefulsets', input_schema: {} },
  { name: 'kubernetes_daemonset_list', description: 'List daemonsets', input_schema: {} },
];

// Mock Server Info
export const mockServerInfo = {
  name: 'Test Server',
  version: '1.0.0',
  protocol_version: '2024-11-05',
};

// Mock Tool Status - Success
export const mockToolsStatusSuccess: MCPToolsStatus = {
  server_url: 'http://test-server.com',
  status: 'success',
  message: 'Success',
  last_checked: Date.now(),
  server_info: mockServerInfo,
  tools: [],
};

// Mock Tool Status - Error
export const mockToolsStatusError = (errorMessage: string): MCPToolsStatus => ({
  server_url: 'http://test-server.com',
  status: 'error',
  message: errorMessage,
  last_checked: Date.now(),
  server_info: mockServerInfo,
  tools: [],
  error_details: {
    code: 'ERR_CONNECTION',
    status_code: 500,
    raw_error: errorMessage,
  },
});

export const createMockToolsResponse = (options: {
  tools?: MCPToolFromAPI[];
  toolsLoaded?: boolean;
  toolsLoadError?: Error | null;
  toolsStatus?: MCPToolsStatus | null;
  isLoading?: boolean;
}): ReturnType<typeof useMCPServerTools> => ({
  tools: options.tools ?? [],
  toolsLoaded: options.toolsLoaded ?? true,
  toolsLoadError: options.toolsLoadError ?? null,
  toolsStatus: options.toolsStatus ?? null,
  isLoading: options.isLoading ?? false,
});
