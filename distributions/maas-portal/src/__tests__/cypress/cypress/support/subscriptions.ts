import {
  mockAPIKeys,
  mockSubscriptionListItems,
  mockSubscriptionFormData,
} from '@odh-dashboard/cypress/cypress/__mocks__/maasFixtures';
import { maasApi } from './portal';

export const setupSubscriptionMocks = (): void => {
  cy.intercept('GET', maasApi('/subscriptions/premium-team-sub'), {
    data: mockSubscriptionListItems()[0],
  }).as('subscriptionDetails');
  cy.intercept('POST', maasApi('/api-keys/search'), (request) => {
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

export const setupGovernanceMocks = (): void => {
  const data = mockSubscriptionFormData();
  cy.intercept('GET', maasApi('/all-subscriptions'), { data: data.subscriptions });
  cy.intercept('GET', maasApi('/all-policies'), { data: data.policies });
  cy.intercept('GET', maasApi('/all-maas-models'), { data: data.modelRefs });
  cy.intercept('GET', maasApi('/all-groups'), { data: data.groups });
};
