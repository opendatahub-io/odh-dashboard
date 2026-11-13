import { act, waitFor } from '@testing-library/react';
import { setupTrackingTest } from '~/__tests__/unit/testUtils/setupTrackingTest';

import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { useConnectionValidation } from '~/app/hooks/useConnectionValidation';

const { mockTrackEvent, renderHook } = setupTrackingTest();

const mockVerifyConnection = jest.fn();
jest.mock('~/app/api/k8s', () => ({
  verifyConnection: (...args: unknown[]) => mockVerifyConnection(...args),
}));

jest.mock('~/app/utils/validationUtils', () => ({
  RECOGNIZED_CONNECTION_ERROR_CODES: new Set([
    'CONNECTION_FAILED',
    'TIMEOUT',
    'UNAUTHORIZED',
    'FORBIDDEN',
  ]),
  getUserFriendlyConnectionError: (code: string | undefined, mode: string) =>
    code ? `Error ${code} for ${mode}` : `Unknown error for ${mode}`,
}));

const expectTracked = (eventName: string, properties: unknown): void => {
  expect(mockTrackEvent).toHaveBeenCalledWith(
    eventName,
    expect.objectContaining(properties),
    expect.objectContaining({ pageContextPolicy: expect.any(Function) }),
  );
};

const defaultParams = {
  namespace: 'test-ns',
  sourceMode: 'model' as const,
  endpointUrl: 'http://example.com/api',
  apiKeySecretRef: 'my-secret',
  modelName: 'test-model',
  agentName: '',
};

describe('useConnectionValidation - Tracking Events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Evaluations External Connection Tested - Success', () => {
    it('should fire success tracking event when connection succeeds for model', async () => {
      mockVerifyConnection.mockReturnValue(() => Promise.resolve());

      const { result } = renderHook(() => useConnectionValidation(defaultParams));

      await act(async () => {
        await result.current.handleVerifyConnection();
      });

      await waitFor(() => {
        expectTracked(EVAL_HUB_EVENTS.EXTERNAL_CONNECTION_TESTED, {
          outcome: 'success',
          endpointType: 'model',
        });
      });
    });

    it('should fire success tracking event for agent source mode', async () => {
      mockVerifyConnection.mockReturnValue(() => Promise.resolve());

      const { result } = renderHook(() =>
        useConnectionValidation({
          ...defaultParams,
          sourceMode: 'agent',
          agentName: 'my-agent',
        }),
      );

      await act(async () => {
        await result.current.handleVerifyConnection();
      });

      await waitFor(() => {
        expectTracked(EVAL_HUB_EVENTS.EXTERNAL_CONNECTION_TESTED, {
          outcome: 'success',
          endpointType: 'agent',
        });
      });
    });
  });

  describe('Evaluations External Connection Tested - Error', () => {
    it('should fire error tracking event with recognized error code', async () => {
      mockVerifyConnection.mockReturnValue(() =>
        Promise.reject({ error: { code: 'CONNECTION_FAILED' } }),
      );

      const { result } = renderHook(() => useConnectionValidation(defaultParams));

      await act(async () => {
        await result.current.handleVerifyConnection();
      });

      await waitFor(() => {
        expectTracked(EVAL_HUB_EVENTS.EXTERNAL_CONNECTION_TESTED, {
          outcome: 'error',
          endpointType: 'model',
          error: 'Error CONNECTION_FAILED for model',
        });
      });
    });

    it('should fire error tracking event with generic message for unrecognized error code', async () => {
      mockVerifyConnection.mockReturnValue(() => Promise.reject({ error: { code: '503' } }));

      const { result } = renderHook(() => useConnectionValidation(defaultParams));

      await act(async () => {
        await result.current.handleVerifyConnection();
      });

      await waitFor(() => {
        expectTracked(EVAL_HUB_EVENTS.EXTERNAL_CONNECTION_TESTED, {
          outcome: 'error',
          endpointType: 'model',
          error: 'Unknown error for model',
        });
      });
    });

    it('should fire error tracking event with unknown error when no error code', async () => {
      mockVerifyConnection.mockReturnValue(() => Promise.reject(new Error('timeout')));

      const { result } = renderHook(() => useConnectionValidation(defaultParams));

      await act(async () => {
        await result.current.handleVerifyConnection();
      });

      await waitFor(() => {
        expectTracked(EVAL_HUB_EVENTS.EXTERNAL_CONNECTION_TESTED, {
          outcome: 'error',
          endpointType: 'model',
          error: 'Unknown error for model',
        });
      });
    });
  });

  describe('No tracking in other scenarios', () => {
    it('should not fire tracking event on initial render', () => {
      renderHook(() => useConnectionValidation(defaultParams));

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('should not fire tracking event when namespace is undefined', async () => {
      const { result } = renderHook(() =>
        useConnectionValidation({ ...defaultParams, namespace: undefined }),
      );

      await act(async () => {
        await result.current.handleVerifyConnection();
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });
});
