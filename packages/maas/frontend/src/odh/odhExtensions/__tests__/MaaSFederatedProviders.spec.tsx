import React from 'react';
import { render } from '@testing-library/react';
import { DeploymentMode, ModularArchContextProvider } from 'mod-arch-core';
import MaaSFederatedProviders from '~/odh/odhExtensions/MaaSFederatedProviders';

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
});
