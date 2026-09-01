jest.mock('mod-arch-core', () => ({
  useSettings: jest.fn(),
}));

import { PORTAL_SIGN_OUT_PATH, portalLogout } from '../UserDropdown';

describe('portalLogout', () => {
  it('should redirect through the gateway-supported sign-out endpoint', () => {
    const redirect = jest.fn();

    portalLogout(redirect);

    expect(redirect).toHaveBeenCalledWith(PORTAL_SIGN_OUT_PATH);
  });
});
