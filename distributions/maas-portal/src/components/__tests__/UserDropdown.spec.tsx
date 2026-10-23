import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useSettings } from 'mod-arch-core';
import { getMaaSWhoAmI } from '@odh-dashboard/maas/api/whoami';
import UserDropdown, { portalLogout } from '../UserDropdown';

jest.mock('mod-arch-core', () => ({
  useSettings: jest.fn(),
}));
jest.mock('@odh-dashboard/maas/api/whoami', () => ({
  getMaaSWhoAmI: jest.fn(),
}));

const mockUseSettings = jest.mocked(useSettings);
const mockGetMaaSWhoAmI = jest.mocked(getMaaSWhoAmI);

describe('portalLogout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect through the gateway-supported sign-out endpoint to the portal', () => {
    const redirect = jest.fn();

    portalLogout(redirect);

    expect(redirect).toHaveBeenCalledWith('/oauth2/sign_out?rd=%2Fmaas-portal%2F');
  });
});

describe('UserDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.__MAAS_CONSUMER_PORTAL_GRID__ = undefined;
  });

  afterEach(() => {
    window.__MAAS_CONSUMER_PORTAL_GRID__ = undefined;
  });

  it('uses the legacy settings user when grid is off', () => {
    mockUseSettings.mockReturnValue({ userSettings: { userId: 'legacy-user' } } as ReturnType<
      typeof useSettings
    >);
    render(<UserDropdown />);

    expect(screen.getByRole('button', { name: 'User menu' })).toHaveTextContent('legacy-user');
    expect(mockUseSettings).toHaveBeenCalled();
    expect(mockGetMaaSWhoAmI).not.toHaveBeenCalled();
  });

  it.each([
    [{ sub: 'grid-id', name: 'Grid User', email: 'grid@example.com' }, 'Grid User'],
    [{ sub: 'grid-id', email: 'grid@example.com' }, 'grid@example.com'],
    [{ sub: 'grid-id' }, 'grid-id'],
  ])('uses WhoAmI identity in grid mode', async (whoAmI, expectedName) => {
    window.__MAAS_CONSUMER_PORTAL_GRID__ = true;
    mockGetMaaSWhoAmI.mockReturnValue(
      jest.fn().mockResolvedValue({ ...whoAmI, 'https://redhat.com/maas/orgs': [] }),
    );

    render(<UserDropdown />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'User menu' })).toHaveTextContent(expectedName),
    );
    expect(mockGetMaaSWhoAmI).toHaveBeenCalledTimes(1);
    expect(mockUseSettings).not.toHaveBeenCalled();
  });

  it('keeps the grid menu available when WhoAmI fails', async () => {
    window.__MAAS_CONSUMER_PORTAL_GRID__ = true;
    mockGetMaaSWhoAmI.mockReturnValue(jest.fn().mockRejectedValue(new Error('Network error')));

    render(<UserDropdown />);

    await waitFor(() => expect(mockGetMaaSWhoAmI).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'User menu' })).toHaveTextContent('User');
    expect(mockUseSettings).not.toHaveBeenCalled();
  });
});
