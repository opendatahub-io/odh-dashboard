import * as React from 'react';
import { AnalyticsBrowser } from '@segment/analytics-next';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { AnalyticsTrackingProvider, useTrackEvent } from '../react';
import { createStandaloneAnalytics } from '../standalone';

jest.mock('@segment/analytics-next', () => ({
  AnalyticsBrowser: { load: jest.fn() },
}));

const mockLoad = jest.mocked(AnalyticsBrowser.load);

describe('standalone tracking compatibility', () => {
  const originalEnv = process.env;
  const originalAnalytics = Object.getOwnPropertyDescriptor(window, 'analytics');
  const originalClusterID = Object.getOwnPropertyDescriptor(window, 'clusterID');
  const track = jest.fn();
  const page = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.APP_ENV;
    delete process.env.INTERNAL_DASHBOARD_VERSION;
    Reflect.deleteProperty(window, 'analytics');
    Reflect.deleteProperty(window, 'clusterID');
  });

  afterEach(() => {
    process.env = originalEnv;
    for (const [key, descriptor] of [
      ['analytics', originalAnalytics],
      ['clusterID', originalClusterID],
    ] as const) {
      if (descriptor) {
        Object.defineProperty(window, key, descriptor);
      } else {
        Reflect.deleteProperty(window, key);
      }
    }
    jest.restoreAllMocks();
  });

  it('should forward exact events and current metadata through the provider without initialization', () => {
    process.env.APP_ENV = 'production';
    process.env.INTERNAL_DASHBOARD_VERSION = '3.6.0';
    window.clusterID = 'cluster-1';
    window.analytics = { track, page };
    const tracking = createStandaloneAnalytics();
    const { result, rerender } = renderHook(useTrackEvent, {
      wrapper: ({ children }: React.PropsWithChildren) => (
        <AnalyticsTrackingProvider value={tracking}>{children}</AnalyticsTrackingProvider>
      ),
    });

    expect(result.current).toBe(tracking.trackEvent);
    rerender();
    expect(result.current).toBe(tracking.trackEvent);
    expect(track).not.toHaveBeenCalled();
    result.current('standalone-event', { outcome: 'submit', hasDescription: true });
    window.clusterID = 'cluster-2';
    result.current('next-event', {});

    expect(track.mock.calls).toEqual([
      [
        'standalone-event',
        { outcome: 'submit', hasDescription: true, clusterID: 'cluster-1' },
        { app: { version: '3.6.0' } },
      ],
      ['next-event', { clusterID: 'cluster-2' }, { app: { version: '3.6.0' } }],
    ]);
    expect(page).not.toHaveBeenCalled();
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('should preserve development telemetry logs without forwarding to the SDK', () => {
    process.env.APP_ENV = 'development';
    process.env.INTERNAL_DASHBOARD_VERSION = 'dev-version';
    window.analytics = { track, page };
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const tracking = createStandaloneAnalytics();
    expect(log).not.toHaveBeenCalled();

    tracking.trackEvent('standalone-event', { outcome: 'cancel', hasDescription: false });

    expect(log.mock.calls).toEqual([
      [
        'Telemetry event triggered: standalone-event - {"outcome":"cancel","hasDescription":false} for version dev-version',
      ],
    ]);
    expect(track).not.toHaveBeenCalled();
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('should remain silent when no SDK exists and use it if one becomes available later', () => {
    const tracking = createStandaloneAnalytics();
    expect(() => tracking.trackEvent('next-event', {})).not.toThrow();
    expect(mockLoad).not.toHaveBeenCalled();

    window.analytics = { track, page };
    tracking.trackEvent('next-event', {});

    expect(track.mock.calls).toEqual([['next-event', { clusterID: '' }, { app: { version: '' } }]]);
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('should stop forwarding if the SDK is removed without initializing a replacement', () => {
    window.analytics = { track, page };
    const tracking = createStandaloneAnalytics();
    tracking.trackEvent('next-event', {});
    Reflect.deleteProperty(window, 'analytics');

    expect(() => tracking.trackEvent('next-event', {})).not.toThrow();
    expect(track).toHaveBeenCalledTimes(1);
    expect(mockLoad).not.toHaveBeenCalled();
  });
});
