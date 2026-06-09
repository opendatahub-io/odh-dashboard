import { AgentRuntime } from '~/app/types/agentRuntimes';

export const mockAgentRuntime = (overrides?: Partial<AgentRuntime>): AgentRuntime => ({
  name: 'sample-support-agent',
  namespace: 'agent-ops-demo',
  status: 'Ready',
  type: 'agent',
  endpointUrl: 'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080',
  lastSyncTime: '2026-05-12T16:00:03.214610Z',
  ...overrides,
});

export const mockAgentRuntimesList = (runtimes?: AgentRuntime[]) => ({
  runtimes: runtimes ?? [mockAgentRuntime()],
});
