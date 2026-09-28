import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  NimAccountEnabledMode,
  NimAccountTrackingEvent,
  NimFailureCategory,
  fireNimAccountEnabled,
  fireNimAccountRemoved,
} from '../nimTrackingConstants';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);

describe('nimTrackingConstants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the NIM Account Enabled event', () => {
    fireNimAccountEnabled({
      outcome: TrackingOutcome.submit,
      success: true,
      mode: NimAccountEnabledMode.ENABLE,
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(NimAccountTrackingEvent.ENABLED, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: NimAccountEnabledMode.ENABLE,
    });
  });

  it('should fire the NIM Account Enabled event for replace failures', () => {
    fireNimAccountEnabled({
      outcome: TrackingOutcome.submit,
      success: false,
      error: NimFailureCategory.VALIDATION_FAILED,
      mode: NimAccountEnabledMode.REPLACE,
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(NimAccountTrackingEvent.ENABLED, {
      outcome: TrackingOutcome.submit,
      success: false,
      error: NimFailureCategory.VALIDATION_FAILED,
      mode: NimAccountEnabledMode.REPLACE,
    });
  });

  it('should fire the NIM Account Removed event', () => {
    fireNimAccountRemoved({
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(NimAccountTrackingEvent.REMOVED, {
      outcome: TrackingOutcome.submit,
      success: true,
    });
  });
});
