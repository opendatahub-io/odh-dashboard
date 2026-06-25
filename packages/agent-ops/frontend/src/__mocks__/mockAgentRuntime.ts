import {
  AgentCardDetail,
  AgentRuntime,
  AgentRuntimeDetail,
  AgentRuntimesList,
} from '~/app/types/agentRuntimes';

export const mockAgentRuntime = (overrides?: Partial<AgentRuntime>): AgentRuntime => ({
  name: 'sample-support-agent',
  namespace: 'agent-ops-demo',
  status: 'Ready',
  type: 'agent',
  endpointUrl: 'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080',
  lastSyncTime: '2026-05-12T16:00:03.214610Z',
  ...overrides,
});

export const mockAgentRuntimesList = (runtimes?: AgentRuntime[]): AgentRuntimesList => ({
  runtimes: runtimes ?? [mockAgentRuntime()],
});

export const mockAgentCardDetail = (overrides?: Partial<AgentCardDetail>): AgentCardDetail => ({
  name: 'Sample Support Agent',
  description: 'Customer support agent that triages tickets and drafts responses.',
  version: '1.0.0',
  agentCardUrl:
    'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080/.well-known/agent-card.json',
  externalAgentCardUrl: 'https://sample-support-agent.apps.example.com/.well-known/agent-card.json',
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/plain'],
  capabilities: {
    streaming: true,
    pushNotifications: false,
    optional: [],
  },
  ...overrides,
});

export const mockAgentRuntimeDetail = (
  overrides?: Partial<AgentRuntimeDetail>,
): AgentRuntimeDetail => {
  const runtime = mockAgentRuntime(overrides?.runtime);
  const endpointUrl = typeof runtime.endpointUrl === 'string' ? runtime.endpointUrl : '';
  const defaultAgentCard = endpointUrl.trim() === '' ? null : mockAgentCardDetail();
  return {
    name: runtime.name,
    namespace: runtime.namespace,
    description: 'Customer support agent that triages tickets and drafts responses.',
    runtime,
    workloadStatus: 'Ready',
    serviceEndpoints: [
      {
        name: 'http',
        url: endpointUrl,
        port: 8080,
      },
    ],
    podCount: 2,
    agentCard: defaultAgentCard,
    ...overrides,
  };
};
