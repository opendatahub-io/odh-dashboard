import {
  type McpDeployment,
  type McpDeploymentCondition,
  type MCPServerCR,
  McpConditionType,
  McpConditionStatus,
  McpAcceptedReason,
  McpReadyReason,
} from '@odh-dashboard/model-registry/types/mcpDeploymentTypes';

const acceptedValid = (): McpDeploymentCondition => ({
  type: McpConditionType.ACCEPTED,
  status: McpConditionStatus.TRUE,
  reason: McpAcceptedReason.VALID,
});

const readyCondition = (
  status: McpConditionStatus,
  reason: string,
  message?: string,
): McpDeploymentCondition => ({
  type: McpConditionType.READY,
  status,
  reason,
  message,
});

export const mockMcpDeployment = (overrides?: Partial<McpDeployment>): McpDeployment => ({
  name: 'kubernetes-mcp',
  displayName: 'Kubernetes MCP',
  serverName: 'Kubernetes',
  namespace: 'test-project',
  uid: 'test-uid-1234',
  creationTimestamp: '2026-03-10T14:30:00Z',
  image: 'quay.io/mcp-servers/kubernetes:1.0.0',
  conditions: [acceptedValid(), readyCondition(McpConditionStatus.TRUE, McpReadyReason.AVAILABLE)],
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
    conditions: [],
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
    conditions: [
      acceptedValid(),
      readyCondition(McpConditionStatus.FALSE, McpReadyReason.DEPLOYMENT_UNAVAILABLE),
    ],
    address: undefined,
    ...overrides,
  });

export const mockInitializingDeployment = (overrides?: Partial<McpDeployment>): McpDeployment =>
  mockMcpDeployment({
    name: 'init-mcp',
    displayName: 'Init MCP',
    serverName: 'Init',
    uid: 'uid-4',
    creationTimestamp: '2026-03-13T09:00:00Z',
    image: 'quay.io/mcp-servers/init:1.0.0',
    conditions: [
      acceptedValid(),
      readyCondition(McpConditionStatus.FALSE, McpReadyReason.INITIALIZING),
    ],
    address: undefined,
    ...overrides,
  });

export const mockConfigInvalidDeployment = (overrides?: Partial<McpDeployment>): McpDeployment =>
  mockMcpDeployment({
    name: 'invalid-mcp',
    displayName: 'Invalid MCP',
    serverName: 'Invalid',
    uid: 'uid-5',
    creationTimestamp: '2026-03-14T09:00:00Z',
    image: 'quay.io/mcp-servers/invalid:1.0.0',
    conditions: [
      {
        type: McpConditionType.ACCEPTED,
        status: McpConditionStatus.FALSE,
        reason: McpAcceptedReason.INVALID,
        message: 'Invalid port configuration.',
      },
    ],
    address: undefined,
    ...overrides,
  });

export const mockScaledToZeroDeployment = (overrides?: Partial<McpDeployment>): McpDeployment =>
  mockMcpDeployment({
    name: 'scaled-mcp',
    displayName: 'Scaled MCP',
    serverName: 'Scaled',
    uid: 'uid-6',
    creationTimestamp: '2026-03-15T09:00:00Z',
    image: 'quay.io/mcp-servers/scaled:1.0.0',
    conditions: [
      acceptedValid(),
      readyCondition(McpConditionStatus.FALSE, McpReadyReason.SCALED_TO_ZERO),
    ],
    address: undefined,
    ...overrides,
  });

export const mockAllDeployments = (): McpDeployment[] => [
  mockRunningDeployment(),
  mockPendingDeployment(),
  mockFailedDeployment(),
  mockInitializingDeployment(),
  mockConfigInvalidDeployment(),
  mockScaledToZeroDeployment(),
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
