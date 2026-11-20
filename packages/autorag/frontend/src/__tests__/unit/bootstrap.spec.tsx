import React from 'react';
import ReactDOM from 'react-dom/client';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import {
  AnalyticsTrackingProvider,
  useTrackEvent,
  useTrackPageEvent,
} from '@odh-dashboard/analytics/react';
import AppWrapper from '~/odh/AppWrapper';

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
jest.mock('~/odh/PluginStoreContextProvider', () => ({
  PluginStoreContextProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));
jest.mock('~/odh/ProductProvider', () => ({
  ProductProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));
jest.mock('~/odh/registerGenAiRemote', () => ({ registerGenAiRemote: jest.fn() }));
jest.mock('@odh-dashboard/autox-core/ui/components/primitive', () => ({
  UIErrorHandler: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));
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
    default: function TrackingApp() {
      const trackEvent = useAppTrackEvent();
      const trackPageEvent = useAppTrackPageEvent();
      return (
        <button
          type="button"
          data-testid="track-interaction"
          onClick={() => {
            trackEvent('AutoRAG Project Dropdown Option Selected', {
              selectedProject: 'project-a',
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

describe('AutoRAG tracking wiring', () => {
  it('should preserve standalone delivery through the shared adapter without emitting on mount', async () => {
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
      fireEvent.click(screen.getByTestId('track-interaction'));
      expect(log.mock.calls).toEqual([
        [
          'Telemetry event triggered: AutoRAG Project Dropdown Option Selected - {"selectedProject":"project-a"} for version test-version',
        ],
        [`Page event triggered for version test-version : ${window.location.pathname}`],
      ]);
    } finally {
      createRoot.mockRestore();
      rootElement.remove();
      log.mockRestore();
    }
  });

  it('should inherit custom and page callbacks through the federated root', () => {
    const trackEvent = jest.fn();
    const trackPageEvent = jest.fn();
    render(
      <AnalyticsTrackingProvider value={{ trackEvent, trackPageEvent }}>
        <AppWrapper />
      </AnalyticsTrackingProvider>,
    );
    expect(trackEvent).not.toHaveBeenCalled();
    expect(trackPageEvent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('track-interaction'));
    expect(trackEvent.mock.calls).toEqual([
      ['AutoRAG Project Dropdown Option Selected', { selectedProject: 'project-a' }],
    ]);
    expect(trackPageEvent.mock.calls).toEqual([[]]);
  });

  it('should fail on invocation when host tracking wiring is missing', () => {
    const { result } = renderHook(() => ({
      trackEvent: useTrackEvent(),
      trackPageEvent: useTrackPageEvent(),
    }));
    expect(() => result.current.trackEvent('AutoRAG Project Dropdown Option Selected', {})).toThrow(
      'AnalyticsTrackingProvider not provided: trackEvent',
    );
    expect(() => result.current.trackPageEvent()).toThrow(
      'AnalyticsTrackingProvider not provided: trackPageEvent',
    );
  });
});
