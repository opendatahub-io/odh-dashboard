import {
  McpDeployment,
  McpDeploymentCondition,
  McpConditionType,
  McpConditionStatus,
  McpReadyReason,
} from '~/app/mcpDeploymentTypes';
import { mockMcpCondition, mockReadyConditions } from '~/__mocks__/mockMcpDeployment';

export { mockReadyConditions as createReadyConditions };

export const createInitializingConditions = (): McpDeploymentCondition[] => [
  mockMcpCondition({
    type: McpConditionType.ACCEPTED,
    status: McpConditionStatus.TRUE,
    reason: 'Valid',
    message: 'Configuration is valid.',
  }),
  mockMcpCondition({
    type: McpConditionType.READY,
    status: McpConditionStatus.FALSE,
    reason: McpReadyReason.INITIALIZING,
    message: 'Waiting for pods to become ready.',
  }),
];

export const createFailedConditions = (): McpDeploymentCondition[] => [
  mockMcpCondition({
    type: McpConditionType.ACCEPTED,
    status: McpConditionStatus.TRUE,
    reason: 'Valid',
    message: 'Configuration is valid.',
  }),
  mockMcpCondition({
    type: McpConditionType.READY,
    status: McpConditionStatus.FALSE,
    reason: McpReadyReason.DEPLOYMENT_UNAVAILABLE,
    message: 'The server deployment is unavailable.',
  }),
];

export const createMockDeployment = (overrides: Partial<McpDeployment> = {}): McpDeployment => ({
  name: 'kubernetes-mcp',
  namespace: 'mcp-servers',
  uid: 'test-uid-1234',
  creationTimestamp: '2026-03-10T14:30:00Z',
  image: 'quay.io/mcp-servers/kubernetes:1.0.0',
  conditions: mockReadyConditions(),
  ...overrides,
});
