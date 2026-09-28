import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppInitSDK } from '@openshift/dynamic-plugin-sdk-utils';
import type { PluginStore } from '@odh-dashboard/plugin-core';
import { K8sSdkProvider } from '../K8sSdkProvider';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  AppInitSDK: jest.fn(({ children }: { children: React.ReactNode }) => children),
  isUtilsConfigSet: jest.fn(() => true),
}));

jest.mock('@openshift/dynamic-plugin-sdk', () => ({
  PluginStore: jest.fn().mockImplementation(() => ({})),
  PluginStoreProvider: jest.fn(({ children }: { children: React.ReactNode }) => children),
}));

const appFetch = jest.fn(() => Promise.resolve({} as Response));

const renderProvider = (children: React.ReactNode): void => {
  renderToStaticMarkup(
    <K8sSdkProvider store={{} as PluginStore} appFetch={appFetch}>
      {children}
    </K8sSdkProvider>,
  );
};

const getConfigurations = (callIndex: number) =>
  jest.mocked(AppInitSDK).mock.calls[callIndex][0].configurations;

describe('K8sSdkProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should keep SDK callback references stable across renders', () => {
    renderProvider(<div>first render</div>);
    renderProvider(<div>second render</div>);

    const firstConfigurations = getConfigurations(0);
    const secondConfigurations = getConfigurations(1);

    expect(secondConfigurations.apiDiscovery).toBe(firstConfigurations.apiDiscovery);
    expect(secondConfigurations.wsAppSettings).toBe(firstConfigurations.wsAppSettings);
  });

  it('should configure websocket settings and add watch=true to URLs', async () => {
    renderProvider(<div>content</div>);

    const configurations = getConfigurations(0);
    const wsSettings = await configurations.wsAppSettings({ path: '/api/v1/namespaces' });

    expect(wsSettings.host).toBe(
      `${window.location.protocol.replace(/^http/i, 'ws')}//${window.location.host}/wss/k8s`,
    );
    expect(wsSettings.subProtocols).toEqual([]);
    expect(wsSettings.urlAugment?.('/api/v1/namespaces?labelSelector=team%3Dml')).toBe(
      '/api/v1/namespaces?labelSelector=team%3Dml&watch=true',
    );
    expect(wsSettings.urlAugment?.('/api/v1/pods?watch=false')).toBe('/api/v1/pods?watch=false');
  });
});
