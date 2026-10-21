import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useSettings } from 'mod-arch-core';
import { getMaaSMe } from '@odh-dashboard/maas/api/me';
import UserDropdown, { portalLogout } from '../UserDropdown';

jest.mock('mod-arch-core', () => ({
  useSettings: jest.fn(),
}));
jest.mock('@odh-dashboard/maas/api/me', () => ({
  getMaaSMe: jest.fn(),
}));

const mockUseSettings = jest.mocked(useSettings);
const mockGetMaaSMe = jest.mocked(getMaaSMe);

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
    expect(mockGetMaaSMe).not.toHaveBeenCalled();
  });

  it.each([
    [{ sub: 'grid-id', name: 'Grid User', email: 'grid@example.com' }, 'Grid User'],
    [{ sub: 'grid-id', email: 'grid@example.com' }, 'grid@example.com'],
    [{ sub: 'grid-id' }, 'grid-id'],
  ])('uses /me identity in grid mode', async (me, expectedName) => {
    window.__MAAS_CONSUMER_PORTAL_GRID__ = true;
    mockGetMaaSMe.mockReturnValue(
      jest.fn().mockResolvedValue({ ...me, 'https://redhat.com/maas/orgs': [] }),
    );

    render(<UserDropdown />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'User menu' })).toHaveTextContent(expectedName),
    );
    expect(mockGetMaaSMe).toHaveBeenCalledTimes(1);
    expect(mockUseSettings).not.toHaveBeenCalled();
  });

  it('keeps the grid menu available when /me fails', async () => {
    window.__MAAS_CONSUMER_PORTAL_GRID__ = true;
    mockGetMaaSMe.mockReturnValue(jest.fn().mockRejectedValue(new Error('Network error')));

    render(<UserDropdown />);

    await waitFor(() => expect(mockGetMaaSMe).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'User menu' })).toHaveTextContent('User');
    expect(mockUseSettings).not.toHaveBeenCalled();
  });
});
