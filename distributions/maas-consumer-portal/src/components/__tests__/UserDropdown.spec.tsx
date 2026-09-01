jest.mock('mod-arch-core', () => ({
  useSettings: jest.fn(),
}));

import { PORTAL_SIGN_OUT_PATH, portalLogout } from '../UserDropdown';

describe('portalLogout', () => {
  it('should redirect through the gateway-supported sign-out endpoint', () => {
    const location = { href: '' };
    const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
    if (!locationDescriptor) {
      throw new Error('window.location descriptor is unavailable');
    }

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: location,
    });

    portalLogout();

    expect(location.href).toBe(PORTAL_SIGN_OUT_PATH);

    Object.defineProperty(window, 'location', locationDescriptor);
  });
});
