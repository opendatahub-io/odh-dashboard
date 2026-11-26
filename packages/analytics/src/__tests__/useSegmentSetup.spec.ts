import * as React from 'react';
import { act, renderHook as renderConcurrentHook } from '@testing-library/react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { AnalyticsBrowser } from '@segment/analytics-next';
import { createSegmentTracking } from '../createSegmentTracking';
import { fireIdentifyEvent } from '../segmentUtils';
import { useSegmentSetup, type SegmentSetupOptions } from '../useSegmentSetup';
import { usePageTracking } from '../usePageTracking';
import * as segmentInitialization from '../initSegment';

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
    expect(client.identify).not.toHaveBeenCalled();
    expect(client.page).not.toHaveBeenCalled();
    expect(client.track).toHaveBeenCalledTimes(1);
  });

  it('should not rerun setup when only the identify callback changes', async () => {
    const { setup } = createHost();
    const { rerender } = renderHook(useSegmentSetup, { initialProps: setup });
    await act(async () => undefined);
    expect(AnalyticsBrowser.load).toHaveBeenCalledTimes(1);
    expect(client.identify).toHaveBeenCalledTimes(1);
    expect(client.page).toHaveBeenCalledTimes(1);

    const replacementIdentify = jest.fn();
    rerender({ ...setup, identify: replacementIdentify });
    await act(async () => undefined);

    expect(AnalyticsBrowser.load).toHaveBeenCalledTimes(1);
    expect(client.identify).toHaveBeenCalledTimes(1);
    expect(client.page).toHaveBeenCalledTimes(1);
    expect(replacementIdentify).not.toHaveBeenCalled();
  });

  it('should use the latest committed callbacks while a replacement render is suspended', async () => {
    const { setup } = createHost();
    let finishInitialization: () => void = () => undefined;
    const initialization = new Promise<void>((resolve) => {
      finishInitialization = resolve;
    });
    const initSpy = jest
      .spyOn(segmentInitialization, 'initSegment')
      .mockReturnValueOnce(initialization);
    const suspended = new Promise<void>(() => {
      // Keep the replacement render suspended until the test unmounts it.
    });
    const committedIdentify = jest.fn();
    const committedPage = jest.fn();
    const uncommittedIdentify = jest.fn();
    const uncommittedPage = jest.fn();

    try {
      const { rerender, unmount } = renderConcurrentHook(
        ({ options, suspend }) => {
          useSegmentSetup(options);
          if (suspend) {
            throw suspended;
          }
        },
        {
          initialProps: { options: setup, suspend: false },
          wrapper: ({ children }) =>
            React.createElement(React.Suspense, { fallback: null }, children),
        },
      );
      rerender({
        options: { ...setup, identify: committedIdentify, trackPageEvent: committedPage },
        suspend: false,
      });
      rerender({
        options: { ...setup, identify: uncommittedIdentify, trackPageEvent: uncommittedPage },
        suspend: true,
      });

      await act(async () => {
        finishInitialization();
        await initialization;
      });

      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(committedIdentify).toHaveBeenCalledTimes(1);
      expect(committedPage).toHaveBeenCalledTimes(1);
      expect(uncommittedIdentify).not.toHaveBeenCalled();
      expect(uncommittedPage).not.toHaveBeenCalled();
      expect(client.identify).not.toHaveBeenCalled();
      expect(client.page).not.toHaveBeenCalled();
      unmount();
    } finally {
      initSpy.mockRestore();
    }
  });

  it.each([true, false])(
    'should respect original and committed enablement when setup starts enabled=%s',
    async (initialEnabled) => {
      const { setup } = createHost();
      let finishInitialization: () => void = () => undefined;
      const initialization = new Promise<void>((resolve) => {
        finishInitialization = resolve;
      });
      const initSpy = jest
        .spyOn(segmentInitialization, 'initSegment')
        .mockReturnValueOnce(initialization);

      try {
        const { rerender } = renderHook(useSegmentSetup, {
          initialProps: { ...setup, enabled: initialEnabled },
        });
        rerender({ ...setup, enabled: !initialEnabled });

        await act(async () => {
          finishInitialization();
          await initialization;
        });

        expect(initSpy).toHaveBeenCalledTimes(2);
        // Only the newly enabled setup may emit; pending disabled setup must not.
        expect(client.identify).toHaveBeenCalledTimes(initialEnabled ? 0 : 1);
        expect(client.page).toHaveBeenCalledTimes(initialEnabled ? 0 : 1);
        expect(AnalyticsBrowser.load).toHaveBeenCalledTimes(initialEnabled ? 0 : 1);
      } finally {
        initSpy.mockRestore();
      }
    },
  );

  it.each(['superseded', 'unmounted'] as const)(
    'should suppress a pending setup after it is %s',
    async (cleanup) => {
      const { setup } = createHost();
      const identify = jest.fn();
      const trackPageEvent = jest.fn();
      let finishInitialization: () => void = () => undefined;
      const initialization = new Promise<void>((resolve) => {
        finishInitialization = resolve;
      });
      const initSpy = jest
        .spyOn(segmentInitialization, 'initSegment')
        .mockReturnValueOnce(initialization);

      try {
        const { rerender, unmount } = renderHook(useSegmentSetup, { initialProps: setup });
        if (cleanup === 'superseded') {
          rerender({ ...setup, userKey: 'new-user', identify, trackPageEvent });
        } else {
          unmount();
        }

        await act(async () => {
          finishInitialization();
          await initialization;
        });

        expect(initSpy).toHaveBeenCalledTimes(cleanup === 'superseded' ? 2 : 1);
        expect(identify).toHaveBeenCalledTimes(cleanup === 'superseded' ? 1 : 0);
        expect(trackPageEvent).toHaveBeenCalledTimes(cleanup === 'superseded' ? 1 : 0);
        expect(client.identify).not.toHaveBeenCalled();
        expect(client.page).not.toHaveBeenCalled();
      } finally {
        initSpy.mockRestore();
      }
    },
  );

  it('should suppress the cleaned-up setup continuation during Strict Mode replay', async () => {
    const { setup } = createHost();
    renderConcurrentHook(() => useSegmentSetup(setup), { wrapper: React.StrictMode });

    await act(async () => undefined);

    expect(AnalyticsBrowser.load).toHaveBeenCalledTimes(2);
    expect(client.identify).toHaveBeenCalledTimes(1);
    expect(client.page).toHaveBeenCalledTimes(1);
  });

  it('should not duplicate identify when identity and setup inputs change together', async () => {
    const { setup } = createHost();
    const { rerender } = renderHook(useSegmentSetup, { initialProps: setup });
    await act(async () => undefined);
    expect(AnalyticsBrowser.load).toHaveBeenCalledTimes(1);
    expect(client.identify).toHaveBeenCalledTimes(1);

    const replacementIdentify = jest.fn();
    rerender({ ...setup, userKey: 'new-user', identify: replacementIdentify });
    await act(async () => undefined);

    expect(AnalyticsBrowser.load).toHaveBeenCalledTimes(2);
    expect(client.identify).toHaveBeenCalledTimes(1);
    expect(replacementIdentify).toHaveBeenCalledTimes(1);
    expect(client.page).toHaveBeenCalledTimes(2);
  });

  it('should not send identify when disabled or not ready', async () => {
    const { setup } = createHost();
    const { rerender } = renderHook(useSegmentSetup, { initialProps: setup });
    await act(async () => undefined);
    expect(client.identify).toHaveBeenCalledTimes(1);

    const replacementIdentify = jest.fn();
    rerender({ ...setup, enabled: false, identify: replacementIdentify });
    await act(async () => undefined);
    expect(replacementIdentify).not.toHaveBeenCalled();
    expect(AnalyticsBrowser.load).toHaveBeenCalledTimes(1);

    rerender({ ...setup, ready: false, identify: replacementIdentify });
    await act(async () => undefined);
    expect(replacementIdentify).not.toHaveBeenCalled();
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
