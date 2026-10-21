/* eslint-disable camelcase */
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockMaaSModel } from '~/__mocks__/mockMaaSModel';
import { maasModelsPage } from '~/__tests__/cypress/cypress/pages/maasModelsPage';

const modelsPath = '/maas-portal/gen-ai/api/v1/aaa/models';
const configPath = '/maas-portal/api/config';

describe('MaaS Portal models', () => {
  beforeEach(() => {
    cy.intercept('GET', configPath, mockDashboardConfig({})).as('dashboardConfig');
    cy.intercept('GET', '/maas-portal/maas/api/v1/user', {
      data: { userId: 'maas-consumer', clusterAdmin: false },
    });
    cy.intercept('GET', '/maas-portal/maas/api/v1/is-maas-admin', {
      data: { allowed: false },
    });
    // The existing portal shell discovers MaaS namespaces independently of this page.
    // An empty list must not prevent subscription models from loading.
    cy.intercept('GET', '/maas-portal/maas/api/v1/namespaces', { data: [] });
    // Fail on Gen AI namespace discovery, playground APIs, or direct Kubernetes access.
    cy.intercept({ pathname: '/maas-portal/gen-ai/api/**' }, (request) => {
      expect(new URL(request.url).pathname).to.equal(modelsPath);
    });
    cy.intercept({ pathname: '/maas-portal/api/k8s/**' }, () => {
      throw new Error('The MaaS models page must not call Kubernetes');
    });
  });

  it('should keep the page available when configuration cannot be loaded', () => {
    cy.intercept('GET', configPath, { statusCode: 503, body: {} });
    cy.intercept('GET', `${modelsPath}*`, { data: [mockMaaSModel()] }).as('models');
    maasModelsPage.visit();
    cy.wait('@models');
    maasModelsPage.findModelsNavigation().should('be.visible');
    maasModelsPage.findTable().should('contain.text', 'Llama 3');
  });

  it('should load subscription models without a namespace or AI Assets chrome', () => {
    cy.intercept('GET', `${modelsPath}*`, (request) => {
      expect(request.query).to.deep.equal({ sources: 'maas' });
      request.reply({
        data: [mockMaaSModel(), mockMaaSModel({ model_id: 'granite', display_name: 'Granite' })],
      });
    }).as('models');

    maasModelsPage.visit();
    cy.wait('@models');
    maasModelsPage.findTitle().should('have.text', 'Models Endpoints');
    maasModelsPage.findModelsNavigation().should('have.attr', 'href', '/maas-portal/maas/models');
    maasModelsPage.findAIAssetsNavigation().should('not.exist');
    maasModelsPage.findTable().should('contain.text', 'Llama 3').and('contain.text', 'Granite');
    maasModelsPage.findModelIds().should('have.length', 2);
    maasModelsPage.findPlaygroundActions().should('not.exist');
    maasModelsPage.findModelStatusHelp().should('not.exist');
    maasModelsPage.findTabs().should('not.exist');
    cy.testA11y();
  });

  it('should show an empty state when the consumer has no subscription models', () => {
    cy.intercept('GET', `${modelsPath}*`, { data: [] }).as('models');
    maasModelsPage.visit();
    cy.wait('@models');
    maasModelsPage.findEmptyState().should('contain.text', 'No MaaS models available');
    maasModelsPage.findTable().should('not.exist');
    cy.testA11y();
  });

  it('should show an API error and recover when retried', () => {
    cy.intercept('GET', `${modelsPath}*`, { statusCode: 503, body: {} }).as('modelsError');
    maasModelsPage.visit();
    cy.wait('@modelsError');
    maasModelsPage.findError().should('contain.text', 'Unable to load MaaS models');
    maasModelsPage.findLoading().should('not.exist');

    cy.intercept('GET', `${modelsPath}*`, { data: [mockMaaSModel()] }).as('modelsRetry');
    maasModelsPage.findRetry().click();
    cy.wait('@modelsRetry');
    maasModelsPage.findTable().should('contain.text', 'Llama 3');
    maasModelsPage.findError().should('not.exist');
    cy.testA11y();
  });
});
