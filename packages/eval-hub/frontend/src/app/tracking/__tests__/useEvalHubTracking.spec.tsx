/* eslint-disable camelcase */
import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import type { TrackEvent } from '@odh-dashboard/analytics/types';
import { useEvalHubTracking } from '~/app/tracking/useEvalHubTracking';

const noOp = () => undefined;

describe('useEvalHubTracking', () => {
  beforeEach(() => window.__evalHubTrackingEvents?.clear());

  it('should bind a stable facade without emitting on mount or rerender and use replacement callbacks', () => {
    const first = jest.fn();
    const second = jest.fn();
    let value: { trackEvent: TrackEvent; trackPageEvent: () => void } = {
      trackEvent: first,
      trackPageEvent: noOp,
    };
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <AnalyticsTrackingProvider value={value}>{children}</AnalyticsTrackingProvider>
    );
    const result = renderHook(useEvalHubTracking, { wrapper });
    const facade = result.result.current;
    result.rerender();
    expect(result.result.current).toBe(facade);
    expect(first).not.toHaveBeenCalled();
    value = { ...value, trackEvent: second };
    result.rerender();
    expect(result.result.current).toBe(facade);
    result.result.current.trackEvalHubEvent('Evaluations External Link Clicked', {
      url: 'https://example.com/private?token=secret',
      benchmarkId: 'arc',
      surface: 'benchmark_drawer',
    });
    expect(first).not.toHaveBeenCalled();
    expect(second.mock.calls).toEqual([
      [
        'Evaluations External Link Clicked',
        {
          url: 'https://example.com',
          benchmarkId: 'arc',
          surface: 'benchmark_drawer',
          event_source: 'evalhub_ui',
          collection_type: 'unknown',
          provider_type: 'unknown',
        },
        expect.objectContaining({ pageContextPolicy: expect.any(Function) }),
      ],
    ]);
  });

  it('should fail explicitly when a consumer delivers without host wiring', () => {
    const result = renderHook(useEvalHubTracking);
    expect(() =>
      result.result.current.trackEvalHubEvent('Evaluations Job Create Opened', {
        surface: 'benchmark_suites_page',
      }),
    ).toThrow('AnalyticsTrackingProvider not provided: trackEvent');
  });
});

it('should retain scope dedupe while using a replacement host callback', () => {
  window.__evalHubTrackingEvents?.clear();
  const first = jest.fn();
  const second = jest.fn();
  let value: { trackEvent: TrackEvent; trackPageEvent: () => void } = {
    trackEvent: first,
    trackPageEvent: noOp,
  };
  const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <AnalyticsTrackingProvider value={value}>{children}</AnalyticsTrackingProvider>
  );
  const result = renderHook(useEvalHubTracking, { wrapper });
  const scope = result.result.current.createEvalHubTrackingScope();
  const properties = { surface: 'comparison_view', countOfRuns: 2 };
  scope.trackEventOnce('Evaluations Comparison View Rendered', 'first-view', properties);
  value = { ...value, trackEvent: second };
  result.rerender();
  scope.trackEventOnce('Evaluations Comparison View Rendered', 'first-view', properties);
  expect(second).not.toHaveBeenCalled();
  scope.trackEventOnce('Evaluations Comparison View Rendered', 'next-view', properties);
  expect(first).toHaveBeenCalledTimes(1);
  expect(second.mock.calls).toEqual([
    [
      'Evaluations Comparison View Rendered',
      {
        surface: 'comparison_view',
        countOfRuns: 2,
        event_source: 'evalhub_ui',
        collection_type: 'unknown',
        provider_type: 'unknown',
      },
      expect.objectContaining({ pageContextPolicy: expect.any(Function) }),
    ],
  ]);
  scope.clear();
});
