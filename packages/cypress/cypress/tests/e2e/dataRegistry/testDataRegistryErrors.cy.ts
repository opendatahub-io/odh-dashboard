import yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { dataRegistryPage } from '../../../pages/dataRegistry/dataRegistryPage';
import { retryableBefore } from '../../../utils/retryableHooks';

type DataRegistryErrorTestData = {
  testProject: string;
  bffServiceName: string;
  bffNamespace: string;
  apiPath: string;
  errorMessages: {
    serviceUnavailable: string;
    accessDenied: string;
    connectionFailed: string;
  };
  retryButtonTestId: string;
};

describe('Data Registry Error Handling', () => {
  let testData: DataRegistryErrorTestData;

  retryableBefore(() =>
    cy
      .fixture('e2e/dataRegistry/testDataRegistryErrors.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as DataRegistryErrorTestData;
      }),
  );

  beforeEach(() => {
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
  });

  it(
    'should display service unavailable error (503) with retry button',
    {
      tags: ['@DataRegistry', '@ErrorHandling'],
    },
    () => {
      cy.step('Intercept API calls to return 503');
      cy.intercept('GET', `${testData.apiPath}/**/namespaces`, {
        statusCode: 503,
        body: 'Service Unavailable',
      }).as('get503Error');

      cy.step('Navigate to Data Registry');
      dataRegistryPage.visit();

      cy.step('Wait for 503 response');
      cy.wait('@get503Error');

      cy.step('Verify service unavailable error is displayed');
      dataRegistryPage.shouldShowServiceUnavailableError();

      cy.step('Verify retry button is present');
      dataRegistryPage.findRetryButton().should('be.visible');
    },
  );

  it(
    'should display access denied error (403) and disable write actions',
    {
      tags: ['@DataRegistry', '@ErrorHandling'],
    },
    () => {
      cy.step('Intercept API calls to return 403');
      cy.intercept('GET', `${testData.apiPath}/**/namespaces`, {
        statusCode: 403,
        body: 'Forbidden',
      }).as('get403Error');

      cy.step('Navigate to Data Registry');
      dataRegistryPage.visit();

      cy.step('Wait for 403 response');
      cy.wait('@get403Error');

      cy.step('Verify access denied error is displayed');
      dataRegistryPage.shouldShowAccessDeniedError();

      cy.step('Verify retry button is NOT present');
      dataRegistryPage.findRetryButton().should('not.exist');
    },
  );

  it(
    'should display access denied error and disable write actions when fetching assets fails with 403',
    {
      tags: ['@DataRegistry', '@ErrorHandling'],
    },
    () => {
      cy.step('Intercept namespaces call to succeed');
      cy.intercept('GET', `${testData.apiPath}/**/namespaces`, {
        statusCode: 200,
        body: {
          namespaces: [[testData.testProject]],
        },
      }).as('getNamespaces');

      cy.step('Intercept assets call to return 403');
      cy.intercept(
        'GET',
        `${testData.apiPath}/${testData.testProject}/namespaces/*/generic-tables`,
        {
          statusCode: 403,
          body: 'Forbidden',
        },
      ).as('get403Assets');

      cy.step('Navigate to Data Registry with project selected');
      dataRegistryPage.visit(testData.testProject);

      cy.step('Wait for responses');
      cy.wait('@getNamespaces');
      cy.wait('@get403Assets');

      cy.step('Verify access denied error is displayed');
      dataRegistryPage.shouldShowAccessDeniedError();

      cy.step('Verify write actions are disabled');
      dataRegistryPage.shouldDisableWriteActions();
    },
  );

  it(
    'should display connection error with retry button for network failures',
    {
      tags: ['@DataRegistry', '@ErrorHandling'],
    },
    () => {
      cy.step('Intercept API calls to simulate network failure');
      cy.intercept('GET', `${testData.apiPath}/**/namespaces`, {
        forceNetworkError: true,
      }).as('networkError');

      cy.step('Navigate to Data Registry');
      dataRegistryPage.visit();

      cy.step('Wait for network error');
      cy.wait('@networkError');

      cy.step('Verify connection error is displayed');
      dataRegistryPage.shouldShowConnectionError();

      cy.step('Verify retry button is present');
      dataRegistryPage.findRetryButton().should('be.visible');
    },
  );

  it(
    'should allow retry after 503 error',
    {
      tags: ['@DataRegistry', '@ErrorHandling'],
    },
    () => {
      let callCount = 0;

      cy.step('Intercept first call to return 503, second to succeed');
      cy.intercept('GET', `${testData.apiPath}/**/namespaces`, (req) => {
        callCount++;
        if (callCount === 1) {
          req.reply({
            statusCode: 503,
            body: 'Service Unavailable',
          });
        } else {
          req.reply({
            statusCode: 200,
            body: {
              namespaces: [[testData.testProject]],
            },
          });
        }
      }).as('getNamespaces');

      cy.step('Navigate to Data Registry');
      dataRegistryPage.visit();

      cy.step('Wait for initial 503 response');
      cy.wait('@getNamespaces');

      cy.step('Verify service unavailable error is displayed');
      dataRegistryPage.shouldShowServiceUnavailableError();

      cy.step('Click retry button');
      dataRegistryPage.findRetryButton().click();

      cy.step('Wait for successful response');
      cy.wait('@getNamespaces');

      cy.step('Verify error is cleared and project selector is visible');
      dataRegistryPage.findProjectSelector().should('be.visible');
    },
  );
});
