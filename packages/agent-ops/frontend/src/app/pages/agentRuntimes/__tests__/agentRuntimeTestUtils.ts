import { mockAgentRuntime } from '~/__mocks__/mockAgentRuntime';
import { AgentRuntime } from '~/app/types/agentRuntimes';

export { mockAgentRuntime as createMockAgentRuntime };

export const createReadyRuntime = (): AgentRuntime => mockAgentRuntime({ status: 'Ready' });

export const createPendingRuntime = (): AgentRuntime =>
  mockAgentRuntime({
    name: 'pending-agent',
    status: 'Pending',
  });

export const createFailedRuntime = (): AgentRuntime =>
  mockAgentRuntime({
    name: 'failed-agent',
    status: 'Failed',
    endpointUrl: '',
  });

export const createToolRuntime = (): AgentRuntime =>
  mockAgentRuntime({
    name: 'sample-tool',
    status: 'Stopped',
    type: 'tool',
  });
