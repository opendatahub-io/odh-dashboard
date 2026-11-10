import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import App from '#~/app/App';
import AppRoutes from '#~/app/AppRoutes';
import { useApplicationSettings } from '#~/app/useApplicationSettings';
import ProjectsContextProvider from '#~/concepts/projects/ProjectsContext';

// Keep App, PatternFly Page, and both boundaries real; isolate unrelated services and features.
jest.mock('#~/redux/selectors', () => ({
  useUser: () => ({ username: 'test-user', isAllowed: true }),
}));
jest.mock('#~/app/useApplicationSettings', () => ({ useApplicationSettings: jest.fn() }));
jest.mock('#~/app/featureFlags/useDevFeatureFlags', () => ({
  __esModule: true,
  default: (dashboardConfig: unknown) => ({ dashboardConfig, devFeatureFlags: {} }),
}));
jest.mock('#~/utilities/useWatchBuildStatus', () => ({ useWatchBuildStatus: () => [] }));
jest.mock('#~/utilities/useDetectUser', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('#~/utilities/useFederatedNotificationListener', () => ({
  useFederatedNotificationListener: jest.fn(),
}));
jest.mock('#~/concepts/k8s/useStorageClasses', () => ({
  __esModule: true,
  default: () => [[]],
}));
jest.mock('#~/concepts/areas/useFetchDscStatus', () => ({
  __esModule: true,
  default: () => [undefined],
}));
jest.mock('#~/plugins/ExtensibilityContext', () => ({
  ExtensibilityContextProvider: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock('#~/concepts/areas/AreaContext', () => ({
  __esModule: true,
  default: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock('#~/plugins/PluginStoreAreaFlagsProvider', () => ({
  PluginStoreAreaFlagsProvider: () => null,
}));
jest.mock('#~/app/HostApiProvider', () => ({
  __esModule: true,
  default: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock('#~/concepts/userSSAR', () => ({
  AccessReviewProvider: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock('#~/concepts/projects/ProjectsContext', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('#~/concepts/integrations/IntegrationsStatusContext', () => ({
  IntegrationsStatusProvider: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock('#~/concepts/hardwareProfiles/HardwareProfilesContext', () => ({
  HardwareProfilesContextProvider: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock('#~/concepts/modelRegistry/context/ModelRegistriesContext', () => ({
  ModelRegistriesContextProvider: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock('#~/app/QuickStarts', () => ({
  __esModule: true,
  default: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock('@odh-dashboard/ui-core/contexts/NotificationWatcherContext', () => ({
  NotificationWatcherContextProvider: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock('#~/app/Header', () => ({
  __esModule: true,
  default: () => <header data-testid="app-masthead">Masthead</header>,
}));
jest.mock('#~/app/NavSidebar', () => ({
  __esModule: true,
  default: () => <nav data-testid="app-sidebar">Navigation</nav>,
}));
jest.mock('#~/app/AppRoutes', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('#~/app/AppNotificationDrawer', () => ({ __esModule: true, default: () => null }));
jest.mock('#~/app/featureFlags/DevFeatureFlagsBanner', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('#~/components/ToastNotifications', () => ({ __esModule: true, default: () => null }));
jest.mock('#~/app/TelemetrySetup', () => ({ __esModule: true, default: () => null }));
jest.mock('#~/app/whatsNew/WhatsNewModal', () => ({ __esModule: true, default: () => null }));
jest.mock('#~/app/SessionExpiredModal', () => ({ __esModule: true, default: () => null }));
jest.mock('#~/app/appUtils', () => ({ logout: jest.fn() }));

describe('App error boundary wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(useApplicationSettings).mockReturnValue({
      dashboardConfig: mockDashboardConfig({}),
      loaded: true,
      loadError: undefined,
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    jest.mocked(ProjectsContextProvider).mockImplementation(({ children }) => <>{children}</>);
    jest.mocked(AppRoutes).mockReturnValue(<div data-testid="app-routes">Routes</div>);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should render the normal shell without a recovery shell when healthy', () => {
    render(<App />);

    expect(screen.getByTestId('app-masthead')).toBeInTheDocument();
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('app-routes')).toBeInTheDocument();
    expect(screen.queryByTestId('app-error-fallback')).not.toBeInTheDocument();
  });

  it('should place the recovery boundary above the project provider', () => {
    jest.mocked(ProjectsContextProvider).mockImplementation(() => {
      throw new Error('Project provider failed');
    });

    render(<App />);

    expect(screen.getByTestId('app-error-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('error-dashboard-link')).toHaveAttribute('href', '/');
    expect(screen.getByText('Project provider failed')).toBeInTheDocument();
    expect(screen.queryByTestId('app-masthead')).not.toBeInTheDocument();
    expect(screen.queryByTestId('app-sidebar')).not.toBeInTheDocument();
  });

  it('should retain the normal shell when a route throws inside the content boundary', () => {
    jest.mocked(AppRoutes).mockImplementation(() => {
      throw new Error('Route failed');
    });

    render(<App />);

    expect(screen.getByTestId('app-masthead')).toBeInTheDocument();
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
    expect(screen.getByText('Route failed')).toBeInTheDocument();
    expect(screen.queryByTestId('app-error-fallback')).not.toBeInTheDocument();
  });
});
