import { renderHook } from '@odh-dashboard/jest-config/hooks';
import React from 'react';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import { NIMAccountStatus } from '../../api/accounts/hooks';
import { NimAccountEnabledMode, NimFailureCategory } from '../nimTrackingConstants';
import { useNimAccountEnabledTracking } from '../useNimAccountEnabledTracking';

const trackEvent = jest.fn();
const trackPageEvent = jest.fn();
let tracking = { trackEvent, trackPageEvent };
const TrackingWrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
  <AnalyticsTrackingProvider value={tracking}>{children}</AnalyticsTrackingProvider>
);

const renderTrackingHook = (
  submitted: boolean,
  accountStatus: NIMAccountStatus,
  submitMode: NimAccountEnabledMode,
) => {
  const rendered = renderHook(
    (props) => useNimAccountEnabledTracking(props.submitted, props.accountStatus, props.submitMode),
    { initialProps: { submitted, accountStatus, submitMode }, wrapper: TrackingWrapper },
  );
  return {
    ...rendered,
    rerender: (
      nextSubmitted: boolean,
      nextAccountStatus: NIMAccountStatus,
      nextSubmitMode: NimAccountEnabledMode,
    ) =>
      rendered.rerender({
        submitted: nextSubmitted,
        accountStatus: nextAccountStatus,
        submitMode: nextSubmitMode,
      }),
  };
};

describe('useNimAccountEnabledTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tracking = { trackEvent, trackPageEvent };
  });

  it('should track successful enable after validation completes', () => {
    const renderResult = renderTrackingHook(
      true,
      NIMAccountStatus.PENDING,
      NimAccountEnabledMode.ENABLE,
    );

    renderResult.rerender(true, NIMAccountStatus.READY, NimAccountEnabledMode.ENABLE);

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Model Serving NIM Account Enabled', {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: NimAccountEnabledMode.ENABLE,
    });
  });

  it('should require pending validation before tracking replace success', () => {
    const renderResult = renderTrackingHook(
      true,
      NIMAccountStatus.READY,
      NimAccountEnabledMode.REPLACE,
    );

    expect(trackEvent).not.toHaveBeenCalled();

    renderResult.rerender(true, NIMAccountStatus.PENDING, NimAccountEnabledMode.REPLACE);
    renderResult.rerender(true, NIMAccountStatus.READY, NimAccountEnabledMode.REPLACE);

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Model Serving NIM Account Enabled', {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: NimAccountEnabledMode.REPLACE,
    });
  });

  it('should reset tracking refs when resetTrackingRefs is called before a retry', () => {
    const renderResult = renderTrackingHook(
      true,
      NIMAccountStatus.ERROR,
      NimAccountEnabledMode.ENABLE,
    );

    expect(trackEvent).toHaveBeenCalledTimes(1);

    renderResult.result.current.resetTrackingRefs();
    renderResult.rerender(true, NIMAccountStatus.PENDING, NimAccountEnabledMode.ENABLE);
    renderResult.rerender(true, NIMAccountStatus.READY, NimAccountEnabledMode.ENABLE);

    expect(trackEvent).toHaveBeenCalledTimes(2);
    expect(trackEvent).toHaveBeenLastCalledWith('Model Serving NIM Account Enabled', {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: NimAccountEnabledMode.ENABLE,
    });
  });

  it('should track API failures with an allowlisted category', () => {
    const renderResult = renderTrackingHook(
      false,
      NIMAccountStatus.NOT_FOUND,
      NimAccountEnabledMode.ENABLE,
    );

    renderResult.result.current.trackSubmitApiFailure(NimAccountEnabledMode.ENABLE);

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Model Serving NIM Account Enabled', {
      outcome: TrackingOutcome.submit,
      success: false,
      error: NimFailureCategory.API_FAILED,
      mode: NimAccountEnabledMode.ENABLE,
    });
  });

  it('should retain callback identity and emit nothing on unsubmitted rerenders', () => {
    const rendered = renderTrackingHook(
      false,
      NIMAccountStatus.READY,
      NimAccountEnabledMode.ENABLE,
    );
    const initialCallbacks = rendered.result.current;
    rendered.rerender(false, NIMAccountStatus.ERROR, NimAccountEnabledMode.REPLACE);
    expect(rendered).hookToHaveUpdateCount(2);
    expect(rendered.result.current.resetTrackingRefs).toBe(initialCallbacks.resetTrackingRefs);
    expect(rendered.result.current.trackSubmitApiFailure).toBe(
      initialCallbacks.trackSubmitApiFailure,
    );
    expect(trackEvent).not.toHaveBeenCalled();
    expect(trackPageEvent).not.toHaveBeenCalled();
  });

  it('should use a replacement provider callback without duplicating a completed submission', () => {
    const rendered = renderTrackingHook(
      true,
      NIMAccountStatus.PENDING,
      NimAccountEnabledMode.ENABLE,
    );
    const replacement = jest.fn();
    tracking = { trackEvent: replacement, trackPageEvent };
    rendered.rerender(true, NIMAccountStatus.READY, NimAccountEnabledMode.ENABLE);
    rendered.rerender(true, NIMAccountStatus.READY, NimAccountEnabledMode.ENABLE);
    expect(trackEvent).not.toHaveBeenCalled();
    expect(replacement).toHaveBeenCalledTimes(1);
    expect(replacement).toHaveBeenCalledWith('Model Serving NIM Account Enabled', {
      outcome: 'submit',
      success: true,
      mode: 'enable',
    });
    tracking = { trackEvent: jest.fn(), trackPageEvent };
    rendered.rerender(true, NIMAccountStatus.READY, NimAccountEnabledMode.ENABLE);
    expect(tracking.trackEvent).not.toHaveBeenCalled();
    rendered.result.current.trackSubmitApiFailure(NimAccountEnabledMode.REPLACE);
    expect(tracking.trackEvent).toHaveBeenCalledTimes(1);
    expect(tracking.trackEvent).toHaveBeenCalledWith('Model Serving NIM Account Enabled', {
      outcome: 'submit',
      success: false,
      error: 'api_failed',
      mode: 'replace',
    });
  });
});
