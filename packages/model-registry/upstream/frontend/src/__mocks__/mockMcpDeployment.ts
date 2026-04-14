import {
  McpDeployment,
  McpDeploymentList,
  McpDeploymentPhase,
  MCPServerCR,
} from '../app/mcpDeploymentTypes';

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

export const mockMcpDeploymentList = (
  partial?: Partial<McpDeploymentList>,
): McpDeploymentList => ({
  items: [mockMcpDeployment()],
  size: 1,
  ...partial,
});
