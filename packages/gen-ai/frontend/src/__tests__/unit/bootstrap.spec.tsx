import React from 'react';
import ReactDOM from 'react-dom/client';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('~/app/utilities/const', () => ({
  ...jest.requireActual<typeof import('~/app/utilities/const')>('~/app/utilities/const'),
  DEV_MODE: true,
  APP_VERSION: 'test-version',
}));
jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  ModularArchContextProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
  NotificationContextProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));
jest.mock('react-axe', () => jest.fn());
jest.mock('~/odh/PluginStoreContextProvider', () => ({
  PluginStoreContextProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));
jest.mock('~/app/components/ToastNotifications', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/app/App', () => ({
  __esModule: true,
  default: function TrackingApp() {
    const { useTrackEvent } = jest.requireActual<typeof import('@odh-dashboard/analytics/react')>(
      '@odh-dashboard/analytics/react',
    );
    const trackEvent = useTrackEvent();
    return (
      <button
        type="button"
        data-testid="track-interaction"
        onClick={() =>
          trackEvent('Available Endpoints Playground Launched', { assetType: 'model' })
        }
      >
        Track
      </button>
    );
  },
}));

describe('GenAI standalone tracking wiring', () => {
  it('should forward a literal event and properties through the shared standalone adapter', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
    const renderRoot = jest.fn();
    const createRoot = jest
      .spyOn(ReactDOM, 'createRoot')
      .mockReturnValue({ render: renderRoot, unmount: jest.fn() });
    try {
      await import('~/bootstrap');
      expect(createRoot).toHaveBeenCalledWith(rootElement);
      expect(renderRoot).toHaveBeenCalledTimes(1);
      const app = renderRoot.mock.calls[0][0];
      createRoot.mockRestore();
      render(app);
      expect(log).not.toHaveBeenCalled();
      fireEvent.click(screen.getByTestId('track-interaction'));
      expect(log.mock.calls).toEqual([
        [
          'Telemetry event triggered: Available Endpoints Playground Launched - {"assetType":"model"} for version test-version',
        ],
      ]);
    } finally {
      createRoot.mockRestore();
      rootElement.remove();
      log.mockRestore();
    }
  });
});
