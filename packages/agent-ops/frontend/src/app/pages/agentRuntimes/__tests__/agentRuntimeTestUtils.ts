import { mockAgentRuntime } from '~/__mocks__/mockAgentRuntime';

export { mockAgentRuntime as createMockAgentRuntime };

export const createReadyRuntime = () => mockAgentRuntime({ status: 'Ready' });

export const createPendingRuntime = () =>
  mockAgentRuntime({
    name: 'pending-agent',
    status: 'Pending',
  });

export const createFailedRuntime = () =>
  mockAgentRuntime({
    name: 'failed-agent',
    status: 'Failed',
    endpointUrl: '',
  });

export const createToolRuntime = () =>
  mockAgentRuntime({
    name: 'sample-tool',
    status: 'Stopped',
    type: 'tool',
  });
