import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { getMaaSWhoAmI, getMaaSWhoAmIDisplayName } from '@odh-dashboard/maas/api/whoami';
import UserDropdown, { portalLogout } from '../UserDropdown';

jest.mock('@odh-dashboard/maas/api/whoami', () => ({
  getMaaSWhoAmI: jest.fn(),
  getMaaSWhoAmIDisplayName: jest.fn(),
}));

const mockGetMaaSWhoAmI = jest.mocked(getMaaSWhoAmI);
const mockGetMaaSWhoAmIDisplayName = jest.mocked(getMaaSWhoAmIDisplayName);

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
  });

  it('renders the display name from the WhoAmI identity', async () => {
    const whoAmI = { sub: 'user-id', name: 'Test User', 'https://redhat.com/maas/orgs': [] };
    mockGetMaaSWhoAmIDisplayName.mockReturnValue('Test User');
    mockGetMaaSWhoAmI.mockReturnValue(jest.fn().mockResolvedValue(whoAmI));

    render(<UserDropdown />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'User menu' })).toHaveTextContent('Test User'),
    );
    expect(mockGetMaaSWhoAmI).toHaveBeenCalledTimes(1);
    expect(mockGetMaaSWhoAmIDisplayName).toHaveBeenCalledWith(whoAmI);
  });

  it('keeps the user menu available when WhoAmI fails', async () => {
    mockGetMaaSWhoAmI.mockReturnValue(jest.fn().mockRejectedValue(new Error('Network error')));

    render(<UserDropdown />);

    await waitFor(() => expect(mockGetMaaSWhoAmI).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'User menu' })).toHaveTextContent('User');
  });
});
