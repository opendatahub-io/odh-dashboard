import { portalLogout } from '../UserDropdown';

jest.mock('mod-arch-core', () => ({
  useSettings: jest.fn(),
}));

describe('portalLogout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect through the gateway-supported sign-out endpoint to the portal', () => {
    const redirect = jest.fn();

    portalLogout(redirect);

    expect(redirect).toHaveBeenCalledWith('/oauth2/sign_out?rd=%2Fmaas-consumer-portal%2F');
  });
});
