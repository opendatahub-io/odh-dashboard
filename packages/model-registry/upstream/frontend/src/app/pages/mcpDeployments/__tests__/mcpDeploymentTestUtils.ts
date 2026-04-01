import { McpDeployment, McpDeploymentPhase } from '~/app/mcpDeploymentTypes';

export const createMockDeployment = (overrides: Partial<McpDeployment> = {}): McpDeployment => ({
  name: 'kubernetes-mcp',
  namespace: 'mcp-servers',
  uid: 'test-uid-1234',
  creationTimestamp: '2026-03-10T14:30:00Z',
  image: 'quay.io/mcp-servers/kubernetes:1.0.0',
  port: 8080,
  phase: McpDeploymentPhase.RUNNING,
  ...overrides,
});
