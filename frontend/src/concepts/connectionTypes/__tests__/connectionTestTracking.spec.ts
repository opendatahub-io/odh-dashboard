import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { fireConnectionTestCompleted } from '#~/concepts/connectionTypes/connectionTestTracking';

jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

describe('fireConnectionTestCompleted', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['Authentication failed', 'authentication'],
    ['Connection timed out', 'timeout'],
    ['Host unreachable', 'network_unreachable'],
    ['Unexpected failure', 'unknown'],
  ])('should categorize %s without forwarding the diagnostic', (message, errorType) => {
    const rawMessage = `${message}: private-resource-name`;
    const result = { success: false, message: rawMessage };

    fireConnectionTestCompleted('custom-connection-type', result, 123);

    expect(fireFormTrackingEvent).toHaveBeenCalledWith('Connection Test Completed', {
      outcome: TrackingOutcome.submit,
      connectionType: 'data_source',
      status: 'failed',
      success: false,
      durationMs: 123,
      errorType,
    });
    expect(result.message).toBe(rawMessage);
  });

  it('should omit diagnostics and error categories for successful tests', () => {
    fireConnectionTestCompleted(
      'custom-connection-type',
      { success: true, message: 'Connected to private-resource-name' },
      123,
    );

    expect(fireFormTrackingEvent).toHaveBeenCalledWith('Connection Test Completed', {
      outcome: TrackingOutcome.submit,
      connectionType: 'data_source',
      status: 'success',
      success: true,
      durationMs: 123,
    });
  });
});
