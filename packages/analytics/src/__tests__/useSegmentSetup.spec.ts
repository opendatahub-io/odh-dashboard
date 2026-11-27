import * as React from 'react';
import { act, renderHook as renderConcurrentHook, screen } from '@testing-library/react';
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
      // Keep the committed tree visible; hiding it with a fallback runs layout cleanup.
      React.startTransition(() => {
        rerender({
          options: { ...setup, identify: uncommittedIdentify, trackPageEvent: uncommittedPage },
          suspend: true,
        });
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
    'should resume setup after Suspense reveals unchanged inputs (resolved while hidden: %s)',
    async (resolveWhileHidden) => {
      const { setup } = createHost();
      const suspended = new Promise<void>(() => {
        // Keep the fallback committed until the test explicitly reveals the tree.
      });
      const { rerender, unmount } = renderConcurrentHook(
        ({ suspend }) => {
          useSegmentSetup(setup);
          if (suspend) {
            throw suspended;
          }
        },
        {
          initialProps: { suspend: false },
          wrapper: ({ children }) =>
            React.createElement(
              React.Suspense,
              { fallback: React.createElement('div', { 'data-testid': 'setup-fallback' }) },
              children,
            ),
        },
      );

      // Commit the fallback before the real initializer's continuation runs.
      rerender({ suspend: true });
      expect(screen.getByTestId('setup-fallback')).not.toBeNull();
      if (resolveWhileHidden) {
        await act(async () => undefined);
        expect(client.identify).not.toHaveBeenCalled();
        expect(client.page).not.toHaveBeenCalled();
      }

      rerender({ suspend: false });
      await act(async () => undefined);
      expect(screen.queryByTestId('setup-fallback')).toBeNull();
      expect(AnalyticsBrowser.load).toHaveBeenCalledTimes(1);
      expect(client.identify).toHaveBeenCalledTimes(1);
      expect(client.page).toHaveBeenCalledTimes(1);

      // Reconnecting an already completed setup must not emit again or reload the SDK.
      rerender({ suspend: true });
      rerender({ suspend: false });
      await act(async () => undefined);
      expect(AnalyticsBrowser.load).toHaveBeenCalledTimes(1);
      expect(client.identify).toHaveBeenCalledTimes(1);
      expect(client.page).toHaveBeenCalledTimes(1);
      unmount();
    },
  );

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

describe('Segment setup commit invalidation', () => {
  it('should invalidate superseded setup before passive cleanup runs', async () => {
    try {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('scheduler', () => jest.requireActual('scheduler/unstable_mock'));
        // The shared test setup already imports React DOM; isolate it to use the controlled scheduler.
        const isolatedReact = jest.requireActual<typeof import('react')>('react');
        const { createRoot } =
          jest.requireActual<typeof import('react-dom/client')>('react-dom/client');
        const segmentSDK =
          jest.requireMock<typeof import('@segment/analytics-next')>('@segment/analytics-next');
        const trackingModule = jest.requireActual<typeof import('../createSegmentTracking')>(
          '../createSegmentTracking',
        );
        const segmentUtils =
          jest.requireActual<typeof import('../segmentUtils')>('../segmentUtils');
        const segmentSetup =
          jest.requireActual<typeof import('../useSegmentSetup')>('../useSegmentSetup');
        const scheduler = jest.requireActual<{
          unstable_flushUntilNextPaint: () => void;
          unstable_flushAllWithoutAsserting: () => void;
        }>('scheduler/unstable_mock');
        const committedUsers: Array<string | undefined> = [];
        let renderCount = 0;
        const Setup = (options: SegmentSetupOptions) => {
          renderCount += 1;
          segmentSetup.useSegmentSetup(options);
          isolatedReact.useLayoutEffect(() => {
            committedUsers.push(options.userKey);
          }, [options.userKey]);
          return null;
        };
        const originalAnalytics = Object.getOwnPropertyDescriptor(window, 'analytics');
        const originalClusterID = Object.getOwnPropertyDescriptor(window, 'clusterID');
        const actEnvironment = Object.getOwnPropertyDescriptor(
          globalThis,
          'IS_REACT_ACT_ENVIRONMENT',
        );
        // Drive React's scheduler explicitly so act cannot flush away the commit/passive gap.
        Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
          configurable: true,
          writable: true,
          value: false,
        });
        const root = createRoot(document.createElement('div'));
        const oldClient = { identify: jest.fn(), page: jest.fn() };
        const newClient = { identify: jest.fn(), page: jest.fn() };
        jest
          .mocked(segmentSDK.AnalyticsBrowser.load)
          .mockReset()
          .mockReturnValueOnce(oldClient as unknown as AnalyticsBrowser)
          .mockReturnValueOnce(newClient as unknown as AnalyticsBrowser);
        const params = () => ({
          clusterID: window.clusterID ?? '',
          devMode: false,
          version: '1.0',
        });
        const tracking = trackingModule.createSegmentTracking(params);
        const setup: SegmentSetupOptions = {
          segmentKey: 'old-key',
          cdnURL: 'https://cdn.example.test',
          apiHost: 'events.example.test/v1',
          ready: true,
          enabled: true,
          clusterID: 'old-cluster',
          userKey: 'old-user',
          identify: () =>
            segmentUtils.fireIdentifyEvent(
              { userID: 'old-user', isAdmin: false, canCreateProjects: true },
              params(),
            ),
          trackPageEvent: tracking.trackPageEvent,
        };

        try {
          root.render(isolatedReact.createElement(Setup, setup));
          scheduler.unstable_flushUntilNextPaint();
          root.render(
            isolatedReact.createElement(Setup, {
              ...setup,
              segmentKey: 'new-key',
              clusterID: 'new-cluster',
              userKey: 'new-user',
              identify: () =>
                segmentUtils.fireIdentifyEvent(
                  { userID: 'new-user', isAdmin: false, canCreateProjects: true },
                  params(),
                ),
            }),
          );
          // Flush the initial passive setup and replacement commit, stopping before its passive effects.
          scheduler.unstable_flushUntilNextPaint();
          expect(committedUsers).toEqual(['old-user', 'new-user']);
          expect(renderCount).toBe(2);
          expect(segmentSDK.AnalyticsBrowser.load).toHaveBeenCalledTimes(1);
          expect(window.analytics).toBe(oldClient);
          expect(window.clusterID).toBe('old-cluster');

          // The real initializer has resolved; its continuation runs before passive cleanup.
          await Promise.resolve();
          expect(oldClient.identify).not.toHaveBeenCalled();
          expect(oldClient.page).not.toHaveBeenCalled();

          scheduler.unstable_flushAllWithoutAsserting();
          await Promise.resolve();
          expect(segmentSDK.AnalyticsBrowser.load).toHaveBeenCalledTimes(2);
          expect(window.analytics).toBe(newClient);
          expect(newClient.identify.mock.calls).toEqual([
            ['new-user', { clusterID: 'new-cluster', isAdmin: false, canCreateProjects: true }],
          ]);
          expect(newClient.page).toHaveBeenCalledTimes(1);
        } finally {
          root.unmount();
          scheduler.unstable_flushAllWithoutAsserting();
          for (const [target, key, descriptor] of [
            [window, 'analytics', originalAnalytics],
            [window, 'clusterID', originalClusterID],
            [globalThis, 'IS_REACT_ACT_ENVIRONMENT', actEnvironment],
          ] as const) {
            if (descriptor) Object.defineProperty(target, key, descriptor);
            else Reflect.deleteProperty(target, key);
          }
          jest.mocked(segmentSDK.AnalyticsBrowser.load).mockReset();
        }
      });
    } finally {
      jest.dontMock('scheduler');
    }
  });
});
