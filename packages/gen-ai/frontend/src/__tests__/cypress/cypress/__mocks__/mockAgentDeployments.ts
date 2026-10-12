import type {
  AgentDeploymentCreateResponse,
  AgentDeploymentListResponse,
  AgentDeploymentSummary,
} from '~/app/agentProfile/types';

export interface AgentDeploymentListMockResponse {
  data: AgentDeploymentListResponse;
}

export const mockAgentDeployment = (
  overrides: Partial<AgentDeploymentSummary> = {},
): AgentDeploymentSummary => ({
  name: 'coding-assistant-1',
  displayName: 'Coding assistant deployment',
  namespace: 'test-namespace',
  agentProfileId: 'test-uuid-1',
  routeUrl: 'https://coding-assistant-1.apps.example.com',
  createdAt: '2024-05-19T10:00:00Z',
  state: 'ready',
  ...overrides,
});

export const mockAgentDeployments = (
  deployments: Partial<AgentDeploymentSummary>[] = [],
): AgentDeploymentListMockResponse => {
  const data = deployments.map((deployment) => mockAgentDeployment(deployment));
  return { data: { deployments: data, totalCount: data.length } };
};

export const mockAgentDeploymentCreateResponse = (
  overrides: Partial<AgentDeploymentCreateResponse> = {},
): { data: AgentDeploymentCreateResponse } => ({
  data: {
    llamaStackConfigMapName: 'coding-assistant-1-llama-stack',
    wrapperAppConfigMapName: 'coding-assistant-1-wrapper',
    sandboxName: 'coding-assistant-1',
    namespace: 'test-namespace',
    routeUrl: 'https://coding-assistant-1.apps.example.com',
    agentProfileId: 'test-uuid-1',
    ...overrides,
  },
});
