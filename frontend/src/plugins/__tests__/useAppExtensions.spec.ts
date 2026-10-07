import { waitFor } from '@testing-library/react';
import { init, loadRemote } from '@module-federation/runtime';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { fetchDashboardConfig } from '#~/services/dashboardConfigService';
import { filterDisabledAutoRagRemote, useAppExtensions } from '#~/plugins/useAppExtensions';

jest.mock('@module-federation/runtime', () => ({
  init: jest.fn(),
  loadRemote: jest.fn(() => Promise.resolve({ default: [] })),
}));

jest.mock('#~/services/dashboardConfigService', () => ({
  fetchDashboardConfig: jest.fn(),
}));

jest.mock('#~/utilities/const', () => ({
  MF_REMOTES: JSON.stringify([
    { name: 'gen-ai', remoteEntry: '/remoteEntry.js' },
    { name: 'autorag', remoteEntry: '/remoteEntry.js' },
  ]),
}));

const initMock = jest.mocked(init);
const loadRemoteMock = jest.mocked(loadRemote);
const fetchDashboardConfigMock = jest.mocked(fetchDashboardConfig);

describe('filterDisabledAutoRagRemote', () => {
  const remotes = [
    { name: 'gen-ai', remoteEntry: '/remoteEntry.js' },
    { name: 'autorag', remoteEntry: '/remoteEntry.js' },
    { name: 'model-registry', remoteEntry: '/remoteEntry.js' },
  ];

  it('keeps all remotes when AutoRAG is enabled', () => {
    expect(filterDisabledAutoRagRemote(remotes, true)).toEqual(remotes);
  });

  it('skips only the AutoRAG remote when AutoRAG is disabled', () => {
    expect(filterDisabledAutoRagRemote(remotes, false)).toEqual([remotes[0], remotes[2]]);
  });
});

describe('useAppExtensions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, '', '/');
    sessionStorage.clear();
    loadRemoteMock.mockResolvedValue({ default: [] });
  });

  const renderExtensionsHook = async () => {
    const { result } = renderHook(() => useAppExtensions());
    await waitFor(() => expect(result.current[1]).toBe(true));
    return result.current;
  };

  it('does not initialize or request the AutoRAG remote when the dashboard flag is false', async () => {
    fetchDashboardConfigMock.mockResolvedValue(mockDashboardConfig({ autorag: false }));

    await renderExtensionsHook();

    expect(initMock).toHaveBeenCalledWith({
      name: 'app',
      remotes: [{ name: 'gen-ai', entry: '/_mf/gen-ai/remoteEntry.js' }],
    });
    expect(loadRemoteMock).toHaveBeenCalledTimes(1);
    expect(loadRemoteMock).toHaveBeenCalledWith('gen-ai/extensions');
  });

  it('loads AutoRAG when the dashboard flag is true', async () => {
    fetchDashboardConfigMock.mockResolvedValue(mockDashboardConfig({ autorag: true }));

    await renderExtensionsHook();

    expect(loadRemoteMock).toHaveBeenCalledWith('autorag/extensions');
  });

  it('honors a developer query override when the dashboard flag is false', async () => {
    window.history.replaceState({}, '', '/?devFeatureFlags=autorag%3Dtrue');
    fetchDashboardConfigMock.mockResolvedValue(mockDashboardConfig({ autorag: false }));

    await renderExtensionsHook();

    expect(loadRemoteMock).toHaveBeenCalledWith('autorag/extensions');
  });

  it('does not override the dashboard flag for a bare AutoRAG developer flag', async () => {
    window.history.replaceState({}, '', '/?devFeatureFlags=autorag');
    fetchDashboardConfigMock.mockResolvedValue(mockDashboardConfig({ autorag: true }));

    await renderExtensionsHook();

    expect(loadRemoteMock).toHaveBeenCalledWith('autorag/extensions');
  });

  it('matches the developer bulk-toggle semantics', async () => {
    window.history.replaceState({}, '', '/?devFeatureFlags=true');
    fetchDashboardConfigMock.mockResolvedValue(mockDashboardConfig({ autorag: true }));

    await renderExtensionsHook();

    expect(loadRemoteMock).not.toHaveBeenCalledWith('autorag/extensions');
  });

  it('loads AutoRAG when the developer bulk toggle is false', async () => {
    window.history.replaceState({}, '', '/?devFeatureFlags=false');
    fetchDashboardConfigMock.mockResolvedValue(mockDashboardConfig({ autorag: false }));

    await renderExtensionsHook();

    expect(loadRemoteMock).toHaveBeenCalledWith('autorag/extensions');
  });

  it('loads all remotes if fetching the dashboard config fails', async () => {
    fetchDashboardConfigMock.mockRejectedValue(new Error('network'));

    await renderExtensionsHook();

    expect(initMock).toHaveBeenCalledWith({
      name: 'app',
      remotes: [
        { name: 'gen-ai', entry: '/_mf/gen-ai/remoteEntry.js' },
        { name: 'autorag', entry: '/_mf/autorag/remoteEntry.js' },
      ],
    });
    expect(loadRemoteMock).toHaveBeenCalledWith('autorag/extensions');
  });

  it('honors a persisted developer override when the dashboard flag is false', async () => {
    sessionStorage.setItem('odh-feature-flags', JSON.stringify({ autorag: true }));
    fetchDashboardConfigMock.mockResolvedValue(mockDashboardConfig({ autorag: false }));

    await renderExtensionsHook();

    expect(loadRemoteMock).toHaveBeenCalledWith('autorag/extensions');
  });
});
