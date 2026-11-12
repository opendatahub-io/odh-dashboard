import React from 'react';
import ReactDOM from 'react-dom/client';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import {
  AnalyticsTrackingProvider,
  useTrackEvent,
  useTrackPageEvent,
} from '@odh-dashboard/analytics/react';
import { fireDataConnectHubTrackEvent } from '~/app/utilities/tracking';
import DataConnectHubWrapper from '~/odh/DataConnectHubWrapper';

jest.mock('~/app/utilities/const', () => ({
  ...jest.requireActual<typeof import('~/app/utilities/const')>('~/app/utilities/const'),
  DEV_MODE: true,
  APP_VERSION: 'test-version',
}));

jest.mock('mod-arch-core', () => {
  const Provider = ({ children }: React.PropsWithChildren) => <>{children}</>;
  return {
    BrowserStorageContextProvider: Provider,
    NotificationContextProvider: Provider,
    ModularArchContextProvider: Provider,
    DeploymentMode: { Federated: 'federated' },
    asEnumMember: () => undefined,
  };
});
jest.mock('~/app/components/ToastNotifications', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/app/App', () => {
  const { useTrackEvent: useAppTrackEvent, useTrackPageEvent: useAppTrackPageEvent } =
    jest.requireActual<typeof import('@odh-dashboard/analytics/react')>(
      '@odh-dashboard/analytics/react',
    );
  return {
    __esModule: true,
    default: () => {
      const trackEvent = useAppTrackEvent();
      const trackPageEvent = useAppTrackPageEvent();
      return (
        <button
          type="button"
          onClick={() => {
            // Invoke directly so a missing provider cannot be hidden by the helper's catch-all.
            trackEvent('Connections Add Started', {
              project: 'test-project',
              source: 'empty_state',
            });
            trackPageEvent();
          }}
        >
          Track interaction
        </button>
      );
    },
  };
});
jest.mock('~/app/AppRoutes', () => jest.requireMock('~/app/App'));

describe('standalone tracking wiring', () => {
  it('should log standalone interactions through the shared compatibility adapter', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
    const renderRoot = jest.fn();
    const createRoot = jest.spyOn(ReactDOM, 'createRoot').mockReturnValue({
      render: renderRoot,
      unmount: jest.fn(),
    });
    try {
      await import('~/bootstrap');
      expect(createRoot).toHaveBeenCalledWith(rootElement);
      expect(renderRoot).toHaveBeenCalledTimes(1);

      render(renderRoot.mock.calls[0][0]);
      expect(log).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Track interaction' }));
      expect(log.mock.calls).toEqual([
        [
          'Telemetry event triggered: Connections Add Started - {"project":"test-project","source":"empty_state"} for version test-version',
        ],
        [`Page event triggered for version test-version : ${window.location.pathname}`],
      ]);
    } finally {
      createRoot.mockRestore();
      rootElement.remove();
      log.mockRestore();
    }
  });

  it('should inherit the host provider through the federated wrapper', () => {
    const trackEvent = jest.fn();
    const trackPageEvent = jest.fn();
    const value = { trackEvent, trackPageEvent };
    render(
      <AnalyticsTrackingProvider value={value}>
        <DataConnectHubWrapper />
      </AnalyticsTrackingProvider>,
    );
    expect(trackEvent).not.toHaveBeenCalled();
    expect(trackPageEvent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Track interaction' }));
    expect(trackEvent.mock.calls).toEqual([
      ['Connections Add Started', { project: 'test-project', source: 'empty_state' }],
    ]);
    expect(trackPageEvent.mock.calls).toEqual([[]]);
  });

  it('should expose missing wiring on invocation while the feature helper isolates errors', () => {
    const { result } = renderHook(() => ({
      trackEvent: useTrackEvent(),
      trackPageEvent: useTrackPageEvent(),
    }));
    expect(() => result.current.trackEvent('Connections Add Started', {})).toThrow(
      'AnalyticsTrackingProvider not provided: trackEvent',
    );
    expect(() => result.current.trackPageEvent()).toThrow(
      'AnalyticsTrackingProvider not provided: trackPageEvent',
    );
    expect(() =>
      fireDataConnectHubTrackEvent(result.current.trackEvent, {
        eventName: 'Connections Add Started',
        properties: { project: 'test-project', source: 'empty_state' },
      }),
    ).not.toThrow();
  });
});
