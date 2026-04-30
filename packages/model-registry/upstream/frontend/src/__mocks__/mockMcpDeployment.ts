// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import {
  McpDeployment,
  McpDeploymentList,
  McpDeploymentCondition,
  McpConditionType,
  McpConditionStatus,
  McpAcceptedReason,
  McpReadyReason,
  MCPServerCR,
} from '../app/mcpDeploymentTypes';

export const mockMcpCondition = (
  overrides?: Partial<McpDeploymentCondition>,
): McpDeploymentCondition => ({
  type: McpConditionType.READY,
  status: McpConditionStatus.TRUE,
  lastTransitionTime: '2026-03-10T14:31:00Z',
  reason: McpReadyReason.AVAILABLE,
  message: 'The MCP server is ready and serving requests.',
  ...overrides,
});

export const mockReadyConditions = (): McpDeploymentCondition[] => [
  mockMcpCondition({
    type: McpConditionType.ACCEPTED,
    status: McpConditionStatus.TRUE,
    reason: McpAcceptedReason.VALID,
    message: 'Configuration is valid.',
  }),
  mockMcpCondition({
    type: McpConditionType.READY,
    status: McpConditionStatus.TRUE,
    reason: McpReadyReason.AVAILABLE,
    message: 'The MCP server is ready and serving requests.',
  }),
];

export const mockMcpDeployment = (overrides?: Partial<McpDeployment>): McpDeployment => ({
  name: 'kubernetes-mcp',
  displayName: 'Kubernetes MCP',
  serverName: 'Kubernetes',
  namespace: 'test-project',
  uid: 'test-uid-1234',
  creationTimestamp: '2026-03-10T14:30:00Z',
  image: 'quay.io/mcp-servers/kubernetes:1.0.0',
  conditions: mockReadyConditions(),
  address: { url: 'http://kubernetes-mcp.test-project.svc:8080/sse' },
  ...overrides,
});

export const mockMcpServerCR = (overrides?: Partial<MCPServerCR>): MCPServerCR => ({
  apiVersion: 'mcpservers.ai.openshift.io/v1alpha1',
  kind: 'MCPServer',
  metadata: { name: 'kubernetes-mcp' },
  spec: {
    source: {
      type: 'containerImage',
      containerImage: { ref: 'ghcr.io/kubernetes/mcp-server:latest' },
    },
    config: { port: 8080, path: '/sse' },
  },
  ...overrides,
});

export const mockMcpDeploymentList = (partial?: Partial<McpDeploymentList>): McpDeploymentList => ({
  items: [mockMcpDeployment()],
  size: 1,
  ...partial,
});
