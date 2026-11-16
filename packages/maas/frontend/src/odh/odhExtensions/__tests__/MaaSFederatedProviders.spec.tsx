import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DeploymentMode, ModularArchContextProvider, useSettings } from 'mod-arch-core';
import MaaSFederatedProviders from '~/odh/odhExtensions/MaaSFederatedProviders';
import { useMaaSSettings } from '~/app/hooks/useMaaSSettings';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  ModularArchContextProvider: jest.fn(({ children }) => <>{children}</>),
  BrowserStorageContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  NotificationContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSettings: jest.fn(() => ({
    configSettings: {},
    userSettings: {},
    loaded: true,
    loadError: undefined,
  })),
}));

jest.mock('~/app/hooks/useMaaSSettings', () => ({
  useMaaSSettings: jest.fn(() => ({
    configSettings: {},
    userSettings: {},
    loaded: true,
    loadError: undefined,
  })),
}));

jest.mock('~/app/components/ToastNotifications', () => ({
  __esModule: true,
  default: () => null,
}));

const mockModularArchContextProvider = jest.mocked(ModularArchContextProvider);

describe('MaaSFederatedProviders', () => {
  beforeEach(() => {
    mockModularArchContextProvider.mockClear();
  });

  it('uses the mandatory namespace in the MaaS portal', () => {
    window.history.pushState({}, '', '/maas-portal/maas/keys-and-subs');

    render(
      <MaaSFederatedProviders>
        <div />
      </MaaSFederatedProviders>,
    );

    expect(mockModularArchContextProvider.mock.calls[0][0].config).toMatchObject({
      deploymentMode: DeploymentMode.Federated,
      mandatoryNamespace: '__maas_grid__',
    });
  });

  it('keeps the standard namespace configuration in the RHOAI dashboard', () => {
    window.history.pushState({}, '', '/dashboard/maas/keys-and-subs');

    render(
      <MaaSFederatedProviders>
        <div />
      </MaaSFederatedProviders>,
    );

    expect(mockModularArchContextProvider.mock.calls[0][0].config).toMatchObject({
      deploymentMode: DeploymentMode.Federated,
    });
    expect(mockModularArchContextProvider.mock.calls[0][0].config).not.toHaveProperty(
      'mandatoryNamespace',
    );
  });

  it.each([
    ['the settings fail to load', { loaded: false, loadError: new Error('whoami failed') }],
    [
      'the settings load without a user',
      { loaded: true, loadError: undefined, userSettings: null },
    ],
  ])('shows the page load error with a Refresh button when %s', (_, state) => {
    window.history.pushState({}, '', '/dashboard/maas/keys-and-subs');
    jest.mocked(useSettings).mockReturnValueOnce({
      configSettings: {},
      userSettings: {},
      ...state,
    } as ReturnType<typeof useSettings>);

    render(
      <MaaSFederatedProviders>
        <div data-testid="page-content" />
      </MaaSFederatedProviders>,
    );

    expect(screen.getByTestId('maas-settings-error')).toHaveTextContent('Unable to load page');
    expect(screen.getByText('Refresh the page, or try again later.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.queryByTestId('page-content')).not.toBeInTheDocument();
  });

  it('shows the page load error in the MaaS portal when its settings fail to load', () => {
    window.history.pushState({}, '', '/maas-portal/maas/keys-and-subs');
    jest.mocked(useMaaSSettings).mockReturnValueOnce({
      configSettings: null,
      userSettings: null,
      loaded: false,
      loadError: new Error('whoami failed'),
    });

    render(
      <MaaSFederatedProviders>
        <div data-testid="page-content" />
      </MaaSFederatedProviders>,
    );

    expect(screen.getByTestId('maas-settings-error')).toHaveTextContent('Unable to load page');
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.queryByTestId('page-content')).not.toBeInTheDocument();
  });
});
