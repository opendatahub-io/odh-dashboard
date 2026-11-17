import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import {
  NimAccountEnabledMode,
  NimFailureCategory,
  fireNimAccountEnabled,
  fireNimAccountRemoved,
} from '../nimTrackingConstants';

const trackEvent = jest.fn();

describe('nimTrackingConstants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the NIM Account Enabled event', () => {
    fireNimAccountEnabled(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: NimAccountEnabledMode.ENABLE,
    });

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Model Serving NIM Account Enabled', {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: NimAccountEnabledMode.ENABLE,
    });
  });

  it('should fire the NIM Account Enabled event for replace failures', () => {
    fireNimAccountEnabled(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: false,
      error: NimFailureCategory.VALIDATION_FAILED,
      mode: NimAccountEnabledMode.REPLACE,
    });

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Model Serving NIM Account Enabled', {
      outcome: TrackingOutcome.submit,
      success: false,
      error: NimFailureCategory.VALIDATION_FAILED,
      mode: NimAccountEnabledMode.REPLACE,
    });
  });

  it('should fire the NIM Account Removed event', () => {
    fireNimAccountRemoved(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Model Serving NIM Account Removed', {
      outcome: TrackingOutcome.submit,
      success: true,
    });
  });
});
