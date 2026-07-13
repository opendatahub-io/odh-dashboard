import { handleRestFailures, isModArchResponse, restCREATE, restDELETE } from 'mod-arch-core';
import { deleteAgent, startAgent, stopAgent } from '~/app/api/agentLifecycle';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/agent-ops',
  BFF_API_VERSION: 'v1',
}));

jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn((promise: Promise<unknown>) => promise),
  restCREATE: jest.fn(),
  restDELETE: jest.fn(),
  isModArchResponse: jest.fn(),
}));

const mockRestCREATE = jest.mocked(restCREATE);
const mockRestDELETE = jest.mocked(restDELETE);
const mockIsModArchResponse = jest.mocked(isModArchResponse);

const lifecycleParams = {
  namespace: 'agent-ops-demo',
  name: 'sample-support-agent',
};

describe('agentLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(handleRestFailures).mockImplementation((promise: Promise<unknown>) => promise);
  });

  describe('stopAgent', () => {
    it('posts to the stop lifecycle endpoint', async () => {
      mockRestCREATE.mockResolvedValue({
        data: {
          success: true,
          name: 'sample-support-agent',
          namespace: 'agent-ops-demo',
          action: 'stop',
          message: 'Agent stop completed successfully',
        },
      });
      mockIsModArchResponse.mockReturnValue(true);

      const result = await stopAgent('')({}, lifecycleParams);

      expect(mockRestCREATE).toHaveBeenCalledWith(
        '',
        '/agent-ops/api/v1/agents/runtimes/agent-ops-demo/sample-support-agent/stop',
        {},
        {},
        {},
      );
      expect(result.action).toBe('stop');
    });

    it('throws when the BFF returns success: false', async () => {
      mockRestCREATE.mockResolvedValue({
        data: {
          success: false,
          name: 'sample-support-agent',
          namespace: 'agent-ops-demo',
          action: 'stop',
          message: 'Agent is not running',
        },
      });
      mockIsModArchResponse.mockReturnValue(true);

      await expect(stopAgent('')({}, lifecycleParams)).rejects.toThrow('Agent is not running');
    });

    it('throws when the BFF returns the wrong action', async () => {
      mockRestCREATE.mockResolvedValue({
        data: {
          success: true,
          name: 'sample-support-agent',
          namespace: 'agent-ops-demo',
          action: 'start',
          message: 'Agent start completed successfully',
        },
      });
      mockIsModArchResponse.mockReturnValue(true);

      await expect(stopAgent('')({}, lifecycleParams)).rejects.toThrow('Invalid response format');
    });
  });

  describe('startAgent', () => {
    it('posts to the start lifecycle endpoint', async () => {
      mockRestCREATE.mockResolvedValue({
        data: {
          success: true,
          name: 'sample-support-agent',
          namespace: 'agent-ops-demo',
          action: 'start',
          message: 'Agent start completed successfully',
        },
      });
      mockIsModArchResponse.mockReturnValue(true);

      const result = await startAgent('')({}, lifecycleParams);

      expect(mockRestCREATE).toHaveBeenCalledWith(
        '',
        '/agent-ops/api/v1/agents/runtimes/agent-ops-demo/sample-support-agent/start',
        {},
        {},
        {},
      );
      expect(result.action).toBe('start');
    });

    it('throws when the BFF returns success: false', async () => {
      mockRestCREATE.mockResolvedValue({
        data: {
          success: false,
          name: 'sample-support-agent',
          namespace: 'agent-ops-demo',
          action: 'start',
          message: 'Agent already running',
        },
      });
      mockIsModArchResponse.mockReturnValue(true);

      await expect(startAgent('')({}, lifecycleParams)).rejects.toThrow('Agent already running');
    });

    it('throws when the BFF returns the wrong action', async () => {
      mockRestCREATE.mockResolvedValue({
        data: {
          success: true,
          name: 'sample-support-agent',
          namespace: 'agent-ops-demo',
          action: 'stop',
          message: 'Agent stop completed successfully',
        },
      });
      mockIsModArchResponse.mockReturnValue(true);

      await expect(startAgent('')({}, lifecycleParams)).rejects.toThrow('Invalid response format');
    });
  });

  describe('deleteAgent', () => {
    it('deletes the agent runtime without parsing an empty 204 body', async () => {
      mockRestDELETE.mockResolvedValue(undefined);

      await deleteAgent('')({}, lifecycleParams);

      expect(mockRestDELETE).toHaveBeenCalledWith(
        '',
        '/agent-ops/api/v1/agents/runtimes/agent-ops-demo/sample-support-agent',
        {},
        {},
        { parseJSON: false },
      );
    });
  });
});
