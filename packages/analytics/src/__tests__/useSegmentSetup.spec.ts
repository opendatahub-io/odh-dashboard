import { act } from '@testing-library/react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { AnalyticsBrowser } from '@segment/analytics-next';
import { createSegmentTracking } from '../createSegmentTracking';
import { fireIdentifyEvent } from '../segmentUtils';
import { useSegmentSetup, type SegmentSetupOptions } from '../useSegmentSetup';
import { usePageTracking } from '../usePageTracking';

jest.mock('@segment/analytics-next', () => ({ AnalyticsBrowser: { load: jest.fn() } }));

const useHostTracking = ({ setup, pathname }: { setup: SegmentSetupOptions; pathname: string }) => {
  useSegmentSetup(setup);
  usePageTracking(pathname, setup.trackPageEvent);
};

describe('shared host analytics setup', () => {
  const originalAnalytics = Object.getOwnPropertyDescriptor(window, 'analytics');
  const originalClusterID = Object.getOwnPropertyDescriptor(window, 'clusterID');
  let calls: string[];
  let client: { track: jest.Mock; page: jest.Mock; identify: jest.Mock; then: jest.Mock };

  const createHost = () => {
    const params = () => ({ clusterID: window.clusterID ?? '', devMode: false, version: '1.0' });
    const tracking = createSegmentTracking(params);
    const setup: SegmentSetupOptions = {
      segmentKey: 'rhoai-key',
      cdnURL: 'https://console.redhat.com/connections/cdn',
      apiHost: 'console.redhat.com/connections/api/v1',
      ready: true,
      enabled: true,
      clusterID: 'rhoai-cluster',
      userKey: 'username',
      identify: () =>
        fireIdentifyEvent(
          { userID: 'rhoai-user', isAdmin: false, canCreateProjects: true },
          params(),
        ),
      trackPageEvent: tracking.trackPageEvent,
    };
    return { setup, tracking };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Reflect.deleteProperty(window, 'analytics');
    Reflect.deleteProperty(window, 'clusterID');
    calls = [];
    client = {
      track: jest.fn(() => {
        calls.push('track');
      }),
      page: jest.fn(() => {
        calls.push('page');
      }),
      identify: jest.fn(() => {
        calls.push('identify');
      }),
      then: jest.fn(),
    };
    jest.mocked(AnalyticsBrowser.load).mockImplementation(() => {
      calls.push('load');
      return client as unknown as AnalyticsBrowser;
    });
  });

  afterEach(() => {
    for (const [key, descriptor] of [
      ['analytics', originalAnalytics],
      ['clusterID', originalClusterID],
    ] as const) {
      if (descriptor) Object.defineProperty(window, key, descriptor);
      else Reflect.deleteProperty(window, key);
    }
  });

  it('should preserve dashboard setup order, initial page counts, globals, and identity payload', async () => {
    const { setup } = createHost();
    const hook = renderHook(useHostTracking, { initialProps: { setup, pathname: '/models' } });
    await act(async () => undefined);
    // The existing dashboard emits the route page, then identify and the setup page.
    expect(calls).toEqual(['load', 'page', 'identify', 'page']);
    expect(window.analytics).toBe(client);
    expect(window.clusterID).toBe('rhoai-cluster');
    expect(client.identify.mock.calls).toEqual([
      [
        'rhoai-user',
        {
          clusterID: 'rhoai-cluster',
          isAdmin: false,
          canCreateProjects: true,
        },
      ],
    ]);
    // Setup completion keeps its original meaning; SDK readiness is not awaited.
    expect(client.then).not.toHaveBeenCalled();
    expect(hook).hookToHaveUpdateCount(1);

    hook.rerender({ setup, pathname: '/projects' });
    expect(calls).toEqual(['load', 'page', 'identify', 'page', 'page']);
    hook.rerender({ setup, pathname: '/projects' });
    expect(client.page).toHaveBeenCalledTimes(3);
    expect(AnalyticsBrowser.load).toHaveBeenCalledTimes(1);

    hook.rerender({ setup: { ...setup, userKey: 'another-username' }, pathname: '/projects' });
    await act(async () => undefined);
    expect(AnalyticsBrowser.load).toHaveBeenCalledTimes(2);
    expect(client.identify).toHaveBeenCalledTimes(2);
    expect(client.page).toHaveBeenCalledTimes(4);
  });

  it('should skip setup when the key is empty even if the host is ready', async () => {
    const { setup } = createHost();
    const hook = renderHook(useSegmentSetup, {
      initialProps: { ...setup, segmentKey: '' },
    });
    await act(async () => undefined);
    expect(AnalyticsBrowser.load).not.toHaveBeenCalled();
    expect(window.clusterID).toBeUndefined();
    expect(client.identify).not.toHaveBeenCalled();
    expect(client.page).not.toHaveBeenCalled();
    expect(hook).hookToHaveUpdateCount(1);
  });

  it('should leave existing delivery and route tracking intact when setup is not ready', async () => {
    const { setup, tracking } = createHost();
    const hook = renderHook(useHostTracking, {
      initialProps: { setup: { ...setup, ready: false }, pathname: '/models' },
    });
    expect(AnalyticsBrowser.load).not.toHaveBeenCalled();
    expect(client.page).not.toHaveBeenCalled();
    hook.rerender({ setup, pathname: '/models' });
    await act(async () => undefined);
    expect(client.page).toHaveBeenCalledTimes(1);

    // A key-refresh error prevents another setup, while the existing client keeps working.
    hook.rerender({ setup: { ...setup, ready: false }, pathname: '/projects' });
    tracking.trackEvent('existing-event', { success: false });
    expect(AnalyticsBrowser.load).toHaveBeenCalledTimes(1);
    expect(client.page).toHaveBeenCalledTimes(2);
    expect(client.track).toHaveBeenCalledWith(
      'existing-event',
      { success: false, clusterID: 'rhoai-cluster' },
      { app: { version: '1.0' } },
    );
  });

  it('should preserve skip-initialization semantics when disabled with an existing client', async () => {
    window.analytics = client;
    const { setup, tracking } = createHost();
    renderHook(useSegmentSetup, { initialProps: { ...setup, enabled: false } });
    await act(async () => undefined);
    tracking.trackEvent('legacy-event', {});
    expect(AnalyticsBrowser.load).not.toHaveBeenCalled();
    expect(client.identify).toHaveBeenCalledTimes(1);
    expect(client.page).toHaveBeenCalledTimes(1);
    expect(client.track).toHaveBeenCalledTimes(1);
  });

  it('should reuse setup with another distribution configuration and host-owned identify callback', async () => {
    const tracking = createSegmentTracking(() => ({
      clusterID: 'distribution-cluster',
      devMode: false,
      version: '2.5',
    }));
    const identify = jest.fn();
    renderHook(useSegmentSetup, {
      initialProps: {
        segmentKey: 'distribution-key',
        enabled: true,
        ready: true,
        clusterID: 'distribution-cluster',
        cdnURL: 'https://cdn.example.test',
        apiHost: 'events.example.test/v1',
        protocol: 'https' as const,
        identify,
        trackPageEvent: tracking.trackPageEvent,
      },
    });
    await act(async () => undefined);
    tracking.trackEvent('distribution-event', { count: 2 });
    expect(AnalyticsBrowser.load).toHaveBeenCalledWith(
      { writeKey: 'distribution-key', cdnURL: 'https://cdn.example.test' },
      { integrations: { 'Segment.io': { apiHost: 'events.example.test/v1', protocol: 'https' } } },
    );
    expect(identify).toHaveBeenCalledTimes(1);
    expect(client.page.mock.calls).toEqual([
      [undefined, { clusterID: 'distribution-cluster' }, { app: { version: '2.5' } }],
    ]);
    expect(client.track).toHaveBeenCalledWith(
      'distribution-event',
      { count: 2, clusterID: 'distribution-cluster' },
      { app: { version: '2.5' } },
    );
  });
});
