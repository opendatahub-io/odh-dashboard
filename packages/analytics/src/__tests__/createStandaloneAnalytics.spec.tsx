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
  const originalAnalytics = Object.getOwnPropertyDescriptor(window, 'analytics');
  const originalClusterID = Object.getOwnPropertyDescriptor(window, 'clusterID');
  const track = jest.fn();
  const page = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Reflect.deleteProperty(window, 'analytics');
    Reflect.deleteProperty(window, 'clusterID');
  });

  afterEach(() => {
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
    window.clusterID = 'cluster-1';
    window.analytics = { track, page };
    const tracking = createStandaloneAnalytics({ devMode: false, version: '3.6.0' });
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
    window.analytics = { track, page };
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const tracking = createStandaloneAnalytics({ devMode: true, version: 'dev-version' });
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
    const tracking = createStandaloneAnalytics({ devMode: false, version: '' });
    expect(() => tracking.trackEvent('next-event', {})).not.toThrow();
    expect(mockLoad).not.toHaveBeenCalled();

    window.analytics = { track, page };
    tracking.trackEvent('next-event', {});

    expect(track.mock.calls).toEqual([['next-event', { clusterID: '' }, { app: { version: '' } }]]);
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('should stop forwarding if the SDK is removed without initializing a replacement', () => {
    window.analytics = { track, page };
    const tracking = createStandaloneAnalytics({ devMode: false, version: '' });
    tracking.trackEvent('next-event', {});
    Reflect.deleteProperty(window, 'analytics');

    expect(() => tracking.trackEvent('next-event', {})).not.toThrow();
    expect(track).toHaveBeenCalledTimes(1);
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('should forward per-event policies through the regular standalone provider', () => {
    window.clusterID = 'standalone-cluster';
    window.analytics = { track, page };
    const pageContextPolicy = jest.fn(() => ({
      path: '/redacted',
      url: 'https://safe.example/redacted',
      referrer: '',
      search: '',
      title: 'Safe title',
    }));
    const tracking = createStandaloneAnalytics({ devMode: false, version: 'standalone-version' });
    const rendered = renderHook(useTrackEvent, {
      wrapper: ({ children }: React.PropsWithChildren) => (
        <AnalyticsTrackingProvider value={tracking}>{children}</AnalyticsTrackingProvider>
      ),
    });
    rendered.result.current('standalone-event', { success: false }, { pageContextPolicy });
    expect(track.mock.calls).toEqual([
      [
        'standalone-event',
        { success: false, clusterID: 'standalone-cluster' },
        {
          app: { version: 'standalone-version' },
          page: {
            path: '/redacted',
            url: 'https://safe.example/redacted',
            referrer: '',
            search: '',
            title: 'Safe title',
          },
        },
      ],
    ]);
    expect(pageContextPolicy).toHaveBeenCalledTimes(1);
    expect(page).not.toHaveBeenCalled();
    expect(mockLoad).not.toHaveBeenCalled();
  });
});
