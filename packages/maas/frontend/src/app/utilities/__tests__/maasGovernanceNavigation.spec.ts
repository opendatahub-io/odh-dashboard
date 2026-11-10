import { getSubscriptionViewUrl, isMaaSPortalHost } from '~/app/utilities/maasGovernanceNavigation';

describe('MaaS governance navigation', () => {
  const originalPathname = window.location.pathname;

  afterEach(() => {
    window.history.replaceState({}, '', originalPathname);
  });

  it('detects the MaaS Portal host', () => {
    window.history.replaceState({}, '', '/maas-portal/maas/model-access');

    expect(isMaaSPortalHost()).toBe(true);
  });

  it('does not treat the main dashboard as the MaaS Portal host', () => {
    window.history.replaceState({}, '', '/maas/keys-and-subs');

    expect(isMaaSPortalHost()).toBe(false);
  });

  it('preserves the encoded subscription path for the main dashboard', () => {
    expect(getSubscriptionViewUrl('subscription/name')).toBe(
      '/maas/maas-governance/subscriptions/view/subscription%2Fname',
    );
  });
});
