import { McpDeployment, McpDeploymentPhase } from '~/odh/types/mcpDeploymentTypes';

export const createMockDeployment = (overrides: Partial<McpDeployment> = {}): McpDeployment => ({
  name: 'kubernetes-mcp',
  namespace: 'mcp-servers',
  uid: 'test-uid-1234',
  creationTimestamp: '2026-03-10T14:30:00Z',
  image: 'quay.io/mcp-servers/kubernetes:1.0.0',
  phase: McpDeploymentPhase.RUNNING,
  ...overrides,
});
