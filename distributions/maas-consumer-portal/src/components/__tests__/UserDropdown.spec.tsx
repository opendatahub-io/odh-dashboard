import { PORTAL_SIGN_OUT_PATH, portalLogout } from '../UserDropdown';

jest.mock('mod-arch-core', () => ({
  useSettings: jest.fn(),
}));

describe('portalLogout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect through the gateway-supported sign-out endpoint', () => {
    const redirect = jest.fn();

    portalLogout(redirect);

    expect(redirect).toHaveBeenCalledWith(PORTAL_SIGN_OUT_PATH);
  });
});
