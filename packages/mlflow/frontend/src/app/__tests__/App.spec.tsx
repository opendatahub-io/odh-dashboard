import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { useSettings, useModularArchContext, DeploymentMode } from 'mod-arch-core';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import App from '~/app/App';

jest.mock('mod-arch-core', () => ({
  useSettings: jest.fn(),
  useModularArchContext: jest.fn(),
  DeploymentMode: { Standalone: 'standalone', Embedded: 'embedded' },
  logout: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('~/app/hooks/useNamespaceSelectorWithPersistence', () => ({
  useNamespaceSelectorWithPersistence: jest.fn(),
}));

jest.mock(
  '~/app/AppRoutes',
  () =>
    function StubAppRoutes() {
      return <div data-testid="app-routes">Routes</div>;
    },
);

const mockUseSettings = jest.mocked(useSettings);
const mockUseModularArchContext = jest.mocked(useModularArchContext);
const mockUseNamespaceSelectorWithPersistence = jest.mocked(useNamespaceSelectorWithPersistence);

const defaultNamespaceReturn = {
  namespacesLoaded: true,
  namespacesLoadError: undefined,
  namespaces: [{ name: 'test-ns' }],
  preferredNamespace: { name: 'test-ns' },
  updatePreferredNamespace: jest.fn(),
  clearStoredNamespace: jest.fn(),
  initializationError: undefined,
};

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModularArchContext.mockReturnValue({
      config: { deploymentMode: DeploymentMode.Standalone },
    } as ReturnType<typeof useModularArchContext>);
    mockUseNamespaceSelectorWithPersistence.mockReturnValue(
      defaultNamespaceReturn as ReturnType<typeof useNamespaceSelectorWithPersistence>,
    );
  });

  it('should show SessionExpiredModal when configError contains "unauthorized"', () => {
    mockUseSettings.mockReturnValue({
      configSettings: null,
      userSettings: null,
      loaded: false,
      loadError: new Error('Access unauthorized'),
    });

    render(<App />);

    expect(screen.getByTestId('session-expired-modal')).toBeInTheDocument();
    expect(screen.getByText('Session Expired')).toBeInTheDocument();
    expect(screen.getByTestId('modal-login-button')).toBeInTheDocument();
  });

  it('should show SessionExpiredModal when configError contains "forbidden"', () => {
    mockUseSettings.mockReturnValue({
      configSettings: null,
      userSettings: null,
      loaded: false,
      loadError: new Error('Request forbidden'),
    });

    render(<App />);

    expect(screen.getByTestId('session-expired-modal')).toBeInTheDocument();
  });

  it('should show SessionExpiredModal when namespacesLoadError is an auth error', () => {
    mockUseSettings.mockReturnValue({
      configSettings: { common: { featureFlags: { modelRegistry: true } } },
      userSettings: { userId: 'user' },
      loaded: true,
      loadError: undefined,
    });
    mockUseNamespaceSelectorWithPersistence.mockReturnValue({
      ...defaultNamespaceReturn,
      namespacesLoaded: false,
      namespacesLoadError: new Error('Unauthorized'),
    } as ReturnType<typeof useNamespaceSelectorWithPersistence>);

    render(<App />);

    expect(screen.getByTestId('session-expired-modal')).toBeInTheDocument();
  });

  it('should show SessionExpiredModal when initializationError is an auth error', () => {
    mockUseSettings.mockReturnValue({
      configSettings: { common: { featureFlags: { modelRegistry: true } } },
      userSettings: { userId: 'user' },
      loaded: true,
      loadError: undefined,
    });
    mockUseNamespaceSelectorWithPersistence.mockReturnValue({
      ...defaultNamespaceReturn,
      namespacesLoaded: false,
      initializationError: new Error('Forbidden'),
    } as ReturnType<typeof useNamespaceSelectorWithPersistence>);

    render(<App />);

    expect(screen.getByTestId('session-expired-modal')).toBeInTheDocument();
  });

  it('should show generic error page for non-auth errors', () => {
    mockUseSettings.mockReturnValue({
      configSettings: null,
      userSettings: null,
      loaded: false,
      loadError: new Error('Network timeout'),
    });

    render(<App />);

    expect(screen.queryByTestId('session-expired-modal')).not.toBeInTheDocument();
    expect(screen.getByText('General loading error')).toBeInTheDocument();
    expect(screen.getByText('Network timeout')).toBeInTheDocument();
  });

  it('should show loading spinner when data is still loading', () => {
    mockUseSettings.mockReturnValue({
      configSettings: null,
      userSettings: null,
      loaded: false,
      loadError: undefined,
    });

    render(<App />);

    expect(screen.queryByTestId('session-expired-modal')).not.toBeInTheDocument();
    expect(screen.queryByText('General loading error')).not.toBeInTheDocument();
  });

  it('should render app routes when fully loaded', () => {
    mockUseSettings.mockReturnValue({
      configSettings: { common: { featureFlags: { modelRegistry: true } } },
      userSettings: { userId: 'user' },
      loaded: true,
      loadError: undefined,
    });

    render(<App />);

    expect(screen.queryByTestId('session-expired-modal')).not.toBeInTheDocument();
    expect(screen.queryByText('General loading error')).not.toBeInTheDocument();
    expect(screen.getByTestId('app-routes')).toBeInTheDocument();
  });
});
