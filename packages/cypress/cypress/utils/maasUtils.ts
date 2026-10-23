import { mockSubscriptionFormData, type MaasGovernanceFormData } from '../__mocks__/maasFixtures';

export * from '../__mocks__/maasFixtures';

/** Intercept the four governance list endpoints used by MaaSGovernanceContext. */
export const interceptMaasGovernanceData = (
  data: MaasGovernanceFormData = mockSubscriptionFormData(),
): void => {
  cy.interceptOdh('GET /maas/api/v1/all-subscriptions', { data: data.subscriptions });
  cy.interceptOdh('GET /maas/api/v1/all-policies', { data: data.policies });
  cy.interceptOdh('GET /maas/api/v1/all-maas-models', { data: data.modelRefs });
  cy.interceptOdh('GET /maas/api/v1/all-groups', { data: data.groups });
};
