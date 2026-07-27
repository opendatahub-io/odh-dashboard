import { act, waitFor } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { testConnection } from '#~/services/connectionTestService';
import { ConnectionTestStatus, ConnectionTestResult } from '#~/concepts/connectionTypes/types';
import { useConnectionTest } from '#~/concepts/connectionTypes/useConnectionTest';

jest.mock('#~/services/connectionTestService');
const mockedTestConnection = jest.mocked(testConnection);

describe('useConnectionTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultConnectionType = 's3';
  const defaultFieldValues = { endpoint: 'http://minio:9000', bucket: 'test-bucket' };

  it('should start with NOT_TESTED status and null result', () => {
    const renderResult = testHook(useConnectionTest)(defaultConnectionType, defaultFieldValues);

    expect(renderResult).hookToStrictEqual({
      status: ConnectionTestStatus.NOT_TESTED,
      result: null,
      testConnection: expect.any(Function),
      resetStatus: expect.any(Function),
      abortTest: expect.any(Function),
    });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should transition to TESTING when testConnection is called', async () => {
    // Keep the promise pending so we can observe the TESTING state
    let resolvePromise: (value: ConnectionTestResult) => void = () => undefined;
    mockedTestConnection.mockReturnValue(
      new Promise<ConnectionTestResult>((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const renderResult = testHook(useConnectionTest)(defaultConnectionType, defaultFieldValues);

    act(() => {
      renderResult.result.current.testConnection();
    });

    expect(renderResult.result.current.status).toBe(ConnectionTestStatus.TESTING);
    expect(renderResult.result.current.result).toBeNull();

    // Clean up by resolving the pending promise
    await act(async () => {
      resolvePromise({ success: true, message: 'ok' });
    });
  });

  it('should transition to VERIFIED on successful test', async () => {
    const successResult: ConnectionTestResult = {
      success: true,
      message: 'Connection successful',
    };
    mockedTestConnection.mockResolvedValue(successResult);

    const renderResult = testHook(useConnectionTest)(defaultConnectionType, defaultFieldValues);

    act(() => {
      renderResult.result.current.testConnection();
    });

    await waitFor(() => {
      expect(renderResult.result.current.status).toBe(ConnectionTestStatus.VERIFIED);
    });

    expect(renderResult.result.current.result).toStrictEqual(successResult);
  });

  it('should transition to FAILED on failed test', async () => {
    const failedResult: ConnectionTestResult = {
      success: false,
      message: 'Invalid credentials',
    };
    mockedTestConnection.mockResolvedValue(failedResult);

    const renderResult = testHook(useConnectionTest)(defaultConnectionType, defaultFieldValues);

    act(() => {
      renderResult.result.current.testConnection();
    });

    await waitFor(() => {
      expect(renderResult.result.current.status).toBe(ConnectionTestStatus.FAILED);
    });

    expect(renderResult.result.current.result).toStrictEqual(failedResult);
  });

  it('should transition to FAILED on service error', async () => {
    mockedTestConnection.mockRejectedValue(new Error('Network Error'));

    const renderResult = testHook(useConnectionTest)(defaultConnectionType, defaultFieldValues);

    act(() => {
      renderResult.result.current.testConnection();
    });

    await waitFor(() => {
      expect(renderResult.result.current.status).toBe(ConnectionTestStatus.FAILED);
    });

    expect(renderResult.result.current.result).toStrictEqual({
      success: false,
      message: 'Network Error',
    });
  });

  it('should reset to NOT_TESTED when resetStatus is called', async () => {
    const successResult: ConnectionTestResult = {
      success: true,
      message: 'Connection successful',
    };
    mockedTestConnection.mockResolvedValue(successResult);

    const renderResult = testHook(useConnectionTest)(defaultConnectionType, defaultFieldValues);

    // First run a test to get to VERIFIED state
    act(() => {
      renderResult.result.current.testConnection();
    });

    await waitFor(() => {
      expect(renderResult.result.current.status).toBe(ConnectionTestStatus.VERIFIED);
    });

    // Now reset
    act(() => {
      renderResult.result.current.resetStatus();
    });

    expect(renderResult.result.current.status).toBe(ConnectionTestStatus.NOT_TESTED);
    expect(renderResult.result.current.result).toBeNull();
  });

  it('should abort in-progress test when abortTest is called', async () => {
    let resolvePromise: (value: ConnectionTestResult) => void = () => undefined;
    mockedTestConnection.mockReturnValue(
      new Promise<ConnectionTestResult>((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const renderResult = testHook(useConnectionTest)(defaultConnectionType, defaultFieldValues);

    act(() => {
      renderResult.result.current.testConnection();
    });

    expect(renderResult.result.current.status).toBe(ConnectionTestStatus.TESTING);

    act(() => {
      renderResult.result.current.abortTest();
    });

    // Should revert to NOT_TESTED since it was in TESTING state
    expect(renderResult.result.current.status).toBe(ConnectionTestStatus.NOT_TESTED);
    expect(renderResult.result.current.result).toBeNull();

    // Verify the abort signal was sent
    const callArgs = mockedTestConnection.mock.calls[0];
    expect(callArgs[1]).toBeInstanceOf(AbortSignal);
    expect((callArgs[1] as AbortSignal).aborted).toBe(true);

    // Resolve the pending promise to avoid unhandled rejection
    resolvePromise({ success: true, message: 'ok' });
  });

  it('should abort previous test when testConnection is called again', async () => {
    let resolveFirst: (value: ConnectionTestResult) => void = () => undefined;
    const secondResult: ConnectionTestResult = { success: true, message: 'second' };

    // First call returns a pending promise
    mockedTestConnection.mockReturnValueOnce(
      new Promise<ConnectionTestResult>((resolve) => {
        resolveFirst = resolve;
      }),
    );

    const renderResult = testHook(useConnectionTest)(defaultConnectionType, defaultFieldValues);

    // Start first test
    act(() => {
      renderResult.result.current.testConnection();
    });

    // Capture the first signal
    const firstSignal = mockedTestConnection.mock.calls[0][1] as AbortSignal;

    // Start second test (should abort first)
    mockedTestConnection.mockResolvedValueOnce(secondResult);

    act(() => {
      renderResult.result.current.testConnection();
    });

    // First signal should be aborted
    expect(firstSignal.aborted).toBe(true);

    await waitFor(() => {
      expect(renderResult.result.current.status).toBe(ConnectionTestStatus.VERIFIED);
    });

    expect(renderResult.result.current.result).toStrictEqual(secondResult);

    // Resolve the first promise to avoid unhandled rejection
    resolveFirst({ success: true, message: 'first' });
  });

  it('should abort on unmount', () => {
    let resolvePromise: (value: ConnectionTestResult) => void = () => undefined;
    mockedTestConnection.mockReturnValue(
      new Promise<ConnectionTestResult>((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const renderResult = testHook(useConnectionTest)(defaultConnectionType, defaultFieldValues);

    act(() => {
      renderResult.result.current.testConnection();
    });

    const signal = mockedTestConnection.mock.calls[0][1] as AbortSignal;
    expect(signal.aborted).toBe(false);

    // Unmount the hook
    renderResult.unmount();

    // The signal should now be aborted via the useEffect cleanup
    expect(signal.aborted).toBe(true);

    // Resolve the pending promise to avoid unhandled rejection
    resolvePromise({ success: true, message: 'ok' });
  });

  it('should be a no-op when abortTest is called while not testing', () => {
    const renderResult = testHook(useConnectionTest)(defaultConnectionType, defaultFieldValues);

    expect(renderResult.result.current.status).toBe(ConnectionTestStatus.NOT_TESTED);

    act(() => {
      renderResult.result.current.abortTest();
    });

    expect(renderResult.result.current.status).toBe(ConnectionTestStatus.NOT_TESTED);
    expect(renderResult.result.current.result).toBeNull();
  });

  it('should be a no-op when resetStatus is called while already NOT_TESTED', () => {
    const renderResult = testHook(useConnectionTest)(defaultConnectionType, defaultFieldValues);

    expect(renderResult.result.current.status).toBe(ConnectionTestStatus.NOT_TESTED);

    act(() => {
      renderResult.result.current.resetStatus();
    });

    expect(renderResult.result.current.status).toBe(ConnectionTestStatus.NOT_TESTED);
    expect(renderResult.result.current.result).toBeNull();
  });

  it('should have correct render count', async () => {
    const successResult: ConnectionTestResult = {
      success: true,
      message: 'Connection successful',
    };
    mockedTestConnection.mockResolvedValue(successResult);

    const renderResult = testHook(useConnectionTest)(defaultConnectionType, defaultFieldValues);

    // Initial render
    expect(renderResult).hookToHaveUpdateCount(1);

    act(() => {
      renderResult.result.current.testConnection();
    });

    // After calling testConnection: status -> TESTING, result -> null (2 state updates batched)
    expect(renderResult).hookToHaveUpdateCount(2);

    await waitFor(() => {
      expect(renderResult.result.current.status).toBe(ConnectionTestStatus.VERIFIED);
    });

    // After async completion: result + status updates batched
    expect(renderResult).hookToHaveUpdateCount(3);
  });
});
