/* eslint-disable camelcase */
import { renderHook, waitFor } from '@testing-library/react';
import * as modArchCore from 'mod-arch-core';
import { getMaaSWhoAmI } from '~/app/api/whoami';
import { useGridSettings } from '~/app/hooks/useGridSettings';
import { MAAS_ORGS_CLAIM, type MaaSWhoAmI } from '~/app/types/whoami';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  fetchConfig: jest.fn(),
}));
jest.mock('~/app/api/whoami', () => ({ getMaaSWhoAmI: jest.fn() }));

const mockFetchConfig = jest.mocked(modArchCore.fetchConfig);
const mockGetMaaSWhoAmI = jest.mocked(getMaaSWhoAmI);

const config: modArchCore.ConfigSettings = { common: { featureFlags: { modelRegistry: false } } };
const whoAmI: MaaSWhoAmI = {
  sub: 'user-123',
  name: 'Alex Doe',
  [MAAS_ORGS_CLAIM]: [{ organization_id: 'org-123', roles: ['admins'] }],
};

describe('useGridSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMaaSWhoAmI.mockReturnValue(() => Promise.resolve(whoAmI));
  });

  it('should expose a startup failure without retrying', async () => {
    mockFetchConfig.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(useGridSettings);

    await waitFor(() => expect(result.current.loadError?.message).toBe('Network failure'));
    expect(result.current.loaded).toBe(false);
    expect(mockFetchConfig).toHaveBeenCalledTimes(1);
    expect(mockGetMaaSWhoAmI).toHaveBeenCalledTimes(1);
  });

  it('should load caller identity and organization admin status', async () => {
    mockFetchConfig.mockResolvedValue(config);

    const { result } = renderHook(useGridSettings);

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.loadError).toBeUndefined();
    expect(result.current.userSettings).toEqual({
      userId: 'user-123',
      sub: 'user-123',
      displayName: 'Alex Doe',
      email: undefined,
      orgAdmin: true,
    });
    expect(mockFetchConfig).toHaveBeenCalledTimes(1);
    expect(mockGetMaaSWhoAmI).toHaveBeenCalledTimes(1);
  });

  it('should keep a regular user separate from Kubernetes cluster admin status', async () => {
    mockFetchConfig.mockResolvedValue(config);
    mockGetMaaSWhoAmI.mockReturnValue(() =>
      Promise.resolve({
        ...whoAmI,
        [MAAS_ORGS_CLAIM]: [{ organization_id: 'org-123', roles: [] }],
      }),
    );

    const { result } = renderHook(useGridSettings);

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.userSettings?.orgAdmin).toBe(false);
    expect(result.current.userSettings?.clusterAdmin).toBeUndefined();
  });
});
