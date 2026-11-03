import {
  mockAPIKeys,
  mockSubscriptionListItems,
} from '@odh-dashboard/cypress/cypress/__mocks__/maasFixtures';
import { maasApi } from './portal';

export const setupSubscriptionMocks = (): void => {
  cy.intercept('GET', maasApi('/subscriptions/premium-team-sub'), {
    data: mockSubscriptionListItems()[0],
  }).as('subscriptionDetails');
  cy.intercept('POST', maasApi('/api-keys/search/tenant'), (request) => {
    const subscription = request.body.data.filters?.subscription;
    request.reply({
      data: {
        object: 'list',
        data: mockAPIKeys().filter((key) => !subscription || key.subscription === subscription),
        // eslint-disable-next-line camelcase
        has_more: false,
      },
    });
  }).as('subscriptionKeys');
};
