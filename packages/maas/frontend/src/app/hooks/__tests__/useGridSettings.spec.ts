/* eslint-disable camelcase */
import { renderHook, waitFor } from '@testing-library/react';
import * as modArchCore from 'mod-arch-core';
import { getMaaSMe } from '~/app/api/me';
import { useGridSettings } from '~/app/hooks/useGridSettings';
import { MAAS_ORGS_CLAIM, type MaaSMe } from '~/app/types/me';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  fetchConfig: jest.fn(),
}));
jest.mock('~/app/api/me', () => ({ getMaaSMe: jest.fn() }));

const mockFetchConfig = jest.mocked(modArchCore.fetchConfig);
const mockGetMaaSMe = jest.mocked(getMaaSMe);

const config: modArchCore.ConfigSettings = { common: { featureFlags: { modelRegistry: false } } };
const me: MaaSMe = {
  sub: 'user-123',
  name: 'Alex Doe',
  [MAAS_ORGS_CLAIM]: [{ organization_id: 'org-123', roles: ['admins'] }],
};

describe('useGridSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMaaSMe.mockReturnValue(() => Promise.resolve(me));
  });

  it('should expose a startup failure without retrying', async () => {
    mockFetchConfig.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(useGridSettings);

    await waitFor(() => expect(result.current.loadError?.message).toBe('Network failure'));
    expect(result.current.loaded).toBe(false);
    expect(mockFetchConfig).toHaveBeenCalledTimes(1);
    expect(mockGetMaaSMe).toHaveBeenCalledTimes(1);
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
    expect(mockGetMaaSMe).toHaveBeenCalledTimes(1);
  });

  it('should keep a regular user separate from Kubernetes cluster admin status', async () => {
    mockFetchConfig.mockResolvedValue(config);
    mockGetMaaSMe.mockReturnValue(() =>
      Promise.resolve({
        ...me,
        [MAAS_ORGS_CLAIM]: [{ organization_id: 'org-123', roles: [] }],
      }),
    );

    const { result } = renderHook(useGridSettings);

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.userSettings?.orgAdmin).toBe(false);
    expect(result.current.userSettings?.clusterAdmin).toBeUndefined();
  });
});
