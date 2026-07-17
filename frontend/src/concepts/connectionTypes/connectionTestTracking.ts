import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '#~/concepts/analyticsTracking/trackingProperties';
import { ConnectionTestStatus, ConnectionTestResult } from '#~/concepts/connectionTypes/types';

type ErrorType = 'authentication' | 'timeout' | 'network_unreachable' | 'unknown';

const CONNECTION_CATEGORY = 'data_source';

const classifyErrorType = (result: ConnectionTestResult): ErrorType => {
  const code = result.error ?? '';
  const msg = result.message.toLowerCase();

  if (code === 'CONNECTION_TIMEOUT' || msg.includes('timed out') || msg.includes('timeout')) {
    return 'timeout';
  }
  if (
    msg.includes('authentication') ||
    msg.includes('401') ||
    msg.includes('invalid access key') ||
    msg.includes('invalid credentials')
  ) {
    return 'authentication';
  }
  if (
    msg.includes('resolve host') ||
    msg.includes('unreachable') ||
    msg.includes('connection refused') ||
    msg.includes('dns')
  ) {
    return 'network_unreachable';
  }
  return 'unknown';
};

export const fireConnectionTestInitiated = (
  connectionType: string,
  testCountInSession: number,
): void => {
  fireFormTrackingEvent('Connection Test Initiated', {
    outcome: TrackingOutcome.submit,
    connectionType: CONNECTION_CATEGORY,
    testCountInSession,
  });
};

export const fireConnectionTestCompleted = (
  connectionType: string,
  result: ConnectionTestResult,
  durationMs: number,
): void => {
  fireFormTrackingEvent('Connection Test Completed', {
    outcome: TrackingOutcome.submit,
    connectionType: CONNECTION_CATEGORY,
    status: result.success ? 'success' : 'failed',
    success: result.success,
    durationMs,
    ...(result.success
      ? {}
      : {
          errorType: classifyErrorType(result),
          errorMessage: result.message,
        }),
  });
};

export const fireConnectionFormClosed = (
  lastTestStatus: ConnectionTestStatus,
  formOutcome: 'submitted' | 'cancelled',
): void => {
  const statusMap: Record<ConnectionTestStatus, string> = {
    [ConnectionTestStatus.NOT_TESTED]: 'none',
    [ConnectionTestStatus.TESTING]: 'none',
    [ConnectionTestStatus.VERIFIED]: 'success',
    [ConnectionTestStatus.FAILED]: 'failed',
  };

  fireFormTrackingEvent('Connection Form Closed', {
    outcome: formOutcome === 'submitted' ? TrackingOutcome.submit : TrackingOutcome.cancel,
    lastTestStatus: statusMap[lastTestStatus],
    formOutcome,
  });
};
