import {
  type McpDeployment,
  type MCPServerCR,
  McpDeploymentPhase,
} from '@odh-dashboard/model-registry/types/mcpDeploymentTypes';

export const mockMcpDeployment = (overrides?: Partial<McpDeployment>): McpDeployment => ({
  name: 'kubernetes-mcp',
  displayName: 'Kubernetes MCP',
  serverName: 'Kubernetes',
  namespace: 'test-project',
  uid: 'test-uid-1234',
  creationTimestamp: '2026-03-10T14:30:00Z',
  image: 'quay.io/mcp-servers/kubernetes:1.0.0',
  phase: McpDeploymentPhase.RUNNING,
  address: { url: 'http://kubernetes-mcp.test-project.svc:8080/sse' },
  ...overrides,
});

export const mockRunningDeployment = (overrides?: Partial<McpDeployment>): McpDeployment =>
  mockMcpDeployment({
    name: 'kubernetes-mcp',
    displayName: 'Kubernetes MCP',
    serverName: 'Kubernetes',
    uid: 'uid-1',
    yaml: 'config:\n  port: 8080\n  path: /sse\n',
    ...overrides,
  });

export const mockPendingDeployment = (overrides?: Partial<McpDeployment>): McpDeployment =>
  mockMcpDeployment({
    name: 'github-mcp',
    displayName: 'GitHub MCP',
    serverName: 'GitHub',
    uid: 'uid-2',
    creationTimestamp: '2026-03-11T10:00:00Z',
    image: 'quay.io/mcp-servers/github:2.1.0',
    phase: McpDeploymentPhase.PENDING,
    address: undefined,
    ...overrides,
  });

export const mockFailedDeployment = (overrides?: Partial<McpDeployment>): McpDeployment =>
  mockMcpDeployment({
    name: 'slack-mcp',
    displayName: undefined,
    serverName: 'Slack',
    uid: 'uid-3',
    creationTimestamp: '2026-03-12T08:00:00Z',
    image: 'quay.io/mcp-servers/slack:1.0.0',
    phase: McpDeploymentPhase.FAILED,
    address: undefined,
    ...overrides,
  });

export const mockAllDeployments = (): McpDeployment[] => [
  mockRunningDeployment(),
  mockPendingDeployment(),
  mockFailedDeployment(),
];

export const mockDeploymentListResponse = (
  deployments: McpDeployment[] = mockAllDeployments(),
): { data: { items: McpDeployment[]; size: number } } => ({
  data: { items: deployments, size: deployments.length },
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
