import dataRegistryPage from '../../../pages/dataRegistry/dataRegistryPage';

describe('Data Registry Error Handling', () => {
  let testData: {
    namespacesApi: string;
    assetsApi: string;
    collectionsApi: string;
    labelsApi: string;
    serviceUnavailableMessage: string;
    accessDeniedMessage: string;
    connectionFailedMessage: string;
    project: string;
  };

  before(() => {
    cy.fixture('e2e/dataRegistry/testDataRegistryErrors.yaml').then((data) => {
      testData = data;
    });
  });

  it('should display 503 service unavailable error with retry button', () => {
    cy.intercept('GET', testData.namespacesApi, { statusCode: 503 }).as('namespaces503');

    dataRegistryPage.visit(testData.project);
    cy.wait('@namespaces503');

    dataRegistryPage.shouldShowServiceUnavailable();
    cy.get('[data-testid="retry-button"]').should('be.visible');
  });

  it('should display 403 access denied error for namespaces', () => {
    cy.intercept('GET', testData.namespacesApi, { statusCode: 403 }).as('namespaces403');

    dataRegistryPage.visit(testData.project);
    cy.wait('@namespaces403');

    dataRegistryPage.shouldShowAccessDenied();
    cy.get('[data-testid="retry-button"]').should('not.exist');
  });

  it('should disable write actions when assets return 403', () => {
    cy.intercept('GET', testData.namespacesApi, { fixture: 'namespaces.json' }).as('namespaces');
    cy.intercept('GET', testData.assetsApi, { statusCode: 403 }).as('assets403');
    cy.intercept('GET', testData.collectionsApi, { fixture: 'collections.json' }).as('collections');

    dataRegistryPage.visit(testData.project);
    cy.wait(['@namespaces', '@assets403']);

    dataRegistryPage.shouldDisableRegisterDataButton();
    dataRegistryPage.shouldDisableManageCollectionsAction();
    dataRegistryPage.shouldDisableManageLabelsAction();
  });

  it('should display connection error with retry button', () => {
    cy.intercept('GET', testData.namespacesApi, { forceNetworkError: true }).as(
      'namespacesNetworkError',
    );

    dataRegistryPage.visit(testData.project);
    cy.wait('@namespacesNetworkError');

    dataRegistryPage.shouldShowConnectionError();
    cy.get('[data-testid="retry-button"]').should('be.visible');
  });

  it('should retry and load data after 503 error', () => {
    let callCount = 0;
    cy.intercept('GET', testData.namespacesApi, (req) => {
      callCount++;
      if (callCount === 1) {
        req.reply({ statusCode: 503 });
      } else {
        req.reply({ fixture: 'namespaces.json' });
      }
    }).as('namespacesRetry');

    dataRegistryPage.visit(testData.project);
    cy.wait('@namespacesRetry');

    dataRegistryPage.shouldShowServiceUnavailable();
    dataRegistryPage.clickRetryButton();

    cy.wait('@namespacesRetry');
    dataRegistryPage.shouldShowData();
  });
});
