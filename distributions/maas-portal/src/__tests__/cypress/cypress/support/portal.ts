import {
  mockAPIKeys,
  mockSubscriptionListItems,
  mockSubscriptions,
} from '@odh-dashboard/cypress/cypress/__mocks__/maasFixtures';

export const portalPath = (pathname = '/'): string => `/maas-portal${pathname}`;
export const maasApi = (pathname: string): string => portalPath(`/maas/api/v1${pathname}`);

export const setupPortalMocks = ({
  isMaaSAdmin = false,
  grid = false,
}: { isMaaSAdmin?: boolean; grid?: boolean } = {}): void => {
  cy.intercept('GET', portalPath('/api/config'), { spec: { dashboardConfig: { grid } } });
  cy.intercept('GET', maasApi('/user'), {
    data: { userId: 'portal-user', clusterAdmin: false },
  });
  cy.intercept('GET', maasApi('/me'), {
    data: { sub: 'portal-user', 'https://redhat.com/maas/orgs': [] },
  });
  cy.intercept('GET', maasApi('/is-maas-admin'), { data: { allowed: isMaaSAdmin } }).as('admin');
  cy.intercept('GET', maasApi('/namespaces'), { data: [] });
  cy.intercept('POST', maasApi('/api-keys/search'), {
    // eslint-disable-next-line camelcase
    data: { object: 'list', data: mockAPIKeys(), has_more: false },
  }).as('searchKeys');
  cy.intercept('GET', maasApi('/subscriptions'), { data: mockSubscriptionListItems() });
  cy.intercept('GET', maasApi('/all-subscriptions'), { data: mockSubscriptions() });
  cy.intercept('GET', maasApi('/api-keys-config'), {
    // eslint-disable-next-line camelcase
    data: { max_expiration_days: 365, ephemeral_max_expiration: '1h' },
  });
  cy.intercept('GET', maasApi('/gateway-url'), {
    data: { url: 'https://inference.example.test' },
  });
  cy.intercept('GET', portalPath('/gen-ai/api/v1/user'), { data: { userId: 'portal-user' } });
  cy.intercept('GET', portalPath('/gen-ai/api/v1/namespaces'), { data: [] });
  cy.intercept('GET', portalPath('/gen-ai/api/v1/lsd/status*'), { data: null });
  cy.intercept('GET', portalPath('/gen-ai/api/v1/aaa/models*'), { data: [] });
  cy.intercept('GET', portalPath('/gen-ai/api/v1/aaa/vectorstores*'), { data: [] });
  cy.intercept('GET', portalPath('/gen-ai/api/v1/lsd/vectorstores*'), { data: [] });
};
