import { mockAgentRuntime } from '~/__mocks__/mockAgentRuntime';
import { AgentRuntimeDetail } from '~/app/types/agentRuntimes';

export const mockAgentRuntimeDetail = (
  overrides?: Partial<AgentRuntimeDetail>,
): AgentRuntimeDetail => {
  const runtime = mockAgentRuntime(overrides?.runtime);
  return {
    name: runtime.name,
    namespace: runtime.namespace,
    description:
      'Customer support agent that triages tickets and drafts responses.',
    runtime,
    workloadStatus: 'Ready',
    podCount: 2,
    serviceEndpoints: [
      {
        name: 'http',
        url: runtime.endpointUrl,
        port: 8080,
      },
    ],
    conditions: [
      {
        type: 'Available',
        status: 'True',
        reason: 'MinimumReplicasAvailable',
        message: 'Deployment has minimum availability.',
        lastTransitionTime: runtime.lastSyncTime,
      },
    ],
    ...overrides,
  };
};
