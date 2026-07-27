import * as React from 'react';
import { ConnectionTestStatus, ConnectionTestResult } from '#~/concepts/connectionTypes/types';
import { testConnection } from '#~/services/connectionTestService';

export type UseConnectionTestReturn = {
  status: ConnectionTestStatus;
  result: ConnectionTestResult | null;
  testConnection: () => void;
  resetStatus: () => void;
  abortTest: () => void;
};

export const useConnectionTest = (
  connectionType: string,
  fieldValues: Record<string, string>,
): UseConnectionTestReturn => {
  const [status, setStatus] = React.useState<ConnectionTestStatus>(ConnectionTestStatus.NOT_TESTED);
  const [result, setResult] = React.useState<ConnectionTestResult | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Clean up on unmount
  React.useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const handleTestConnection = React.useCallback(() => {
    // Abort any in-progress test
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus(ConnectionTestStatus.TESTING);
    setResult(null);

    testConnection({ connectionType, fieldValues }, controller.signal)
      .then((testResult) => {
        if (!controller.signal.aborted) {
          setResult(testResult);
          setStatus(
            testResult.success ? ConnectionTestStatus.VERIFIED : ConnectionTestStatus.FAILED,
          );
        }
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) {
          setResult({ success: false, message: e.message });
          setStatus(ConnectionTestStatus.FAILED);
        }
      });
  }, [connectionType, fieldValues]);

  const resetStatus = React.useCallback(() => {
    abortControllerRef.current?.abort();
    setStatus(ConnectionTestStatus.NOT_TESTED);
    setResult(null);
  }, []);

  const abortTest = React.useCallback(() => {
    abortControllerRef.current?.abort();
    if (status === ConnectionTestStatus.TESTING) {
      setStatus(ConnectionTestStatus.NOT_TESTED);
      setResult(null);
    }
  }, [status]);

  return {
    status,
    result,
    testConnection: handleTestConnection,
    resetStatus,
    abortTest,
  };
};
