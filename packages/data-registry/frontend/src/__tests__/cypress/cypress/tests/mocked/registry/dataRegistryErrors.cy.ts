import { mockModArchResponse } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import dataRegistryErrorsPage from '~/__tests__/cypress/cypress/pages/dataRegistryErrorsPage';

const API = '/data-registry/api/v1';
const TEST_PROJECT = 'test-project';
const COLLECTION = 'default';
const PROJECTS_API = `${API}/namespaces`;
const COLLECTIONS_API = `${API}/${TEST_PROJECT}/namespaces`;
const ASSETS_API = `${COLLECTIONS_API}/${COLLECTION}/generic-tables`;
const VOLUMES_API = `${COLLECTIONS_API}/${COLLECTION}/volumes`;
const LABELS_API = `${API}/${TEST_PROJECT}/labels`;
const CONNECTIONS_API = `${API}/connections/${TEST_PROJECT}`;
const registryError = (statusCode: number, message: string) => ({
  statusCode,
  body: { error: { code: String(statusCode), message } },
});

const interceptUser = () => {
  cy.intercept('GET', `${API}/user`, {
    body: mockModArchResponse(mockUserSettings({ userId: 'test-user' })),
  });
};

const interceptProjects = () => {
  cy.intercept('GET', PROJECTS_API, {
    body: mockModArchResponse([mockNamespace({ name: TEST_PROJECT })]),
  }).as('projectNamespaces');
};

const interceptRegistryData = () => {
  cy.intercept('GET', CONNECTIONS_API, { body: { data: [] } });
  cy.intercept('GET', COLLECTIONS_API, { body: { namespaces: [[COLLECTION]] } }).as('collections');
  cy.intercept('GET', `${COLLECTIONS_API}/${COLLECTION}`, {
    body: { namespace: [COLLECTION], properties: {} },
  });
  cy.intercept('GET', ASSETS_API, { body: { assets: [] } });
  cy.intercept('GET', VOLUMES_API, { body: { volumes: [] } });
  cy.intercept('GET', LABELS_API, { body: { labels: [] } });
};

describe('Data Registry Error Handling', () => {
  beforeEach(() => {
    interceptUser();
    interceptProjects();
  });

  it('should display 503 service unavailable error with retry button', () => {
    interceptRegistryData();
    cy.intercept(
      'GET',
      COLLECTIONS_API,
      registryError(503, 'the upstream service is unavailable'),
    ).as('collections503');

    dataRegistryErrorsPage.visit(TEST_PROJECT);
    cy.wait(['@projectNamespaces', '@collections503']);

    dataRegistryErrorsPage.shouldShowServiceUnavailable();
    dataRegistryErrorsPage.shouldShowRetryButton();
    dataRegistryErrorsPage.testA11y();
  });

  it('should display 403 access denied error for collection namespaces', () => {
    interceptRegistryData();
    cy.intercept('GET', COLLECTIONS_API, registryError(403, 'Access denied')).as('collections403');

    dataRegistryErrorsPage.visit(TEST_PROJECT);
    cy.wait(['@projectNamespaces', '@collections403']);

    dataRegistryErrorsPage.shouldShowAccessDenied();
    dataRegistryErrorsPage.shouldNotShowRetryButton();
    dataRegistryErrorsPage.testA11y();
  });

  it('should display access denied when assets return 403', () => {
    interceptRegistryData();
    cy.intercept('GET', ASSETS_API, registryError(403, 'Access denied')).as('assets403');

    dataRegistryErrorsPage.visit(TEST_PROJECT);
    cy.wait(['@projectNamespaces', '@collections', '@assets403']);

    dataRegistryErrorsPage.shouldShowAccessDenied();
    dataRegistryErrorsPage.shouldNotShowRetryButton();
    dataRegistryErrorsPage.testA11y();
  });

  it('should display connection error with retry button', () => {
    interceptRegistryData();
    cy.intercept('GET', COLLECTIONS_API, { forceNetworkError: true }).as('collectionsNetworkError');

    dataRegistryErrorsPage.visit(TEST_PROJECT);
    cy.wait(['@projectNamespaces', '@collectionsNetworkError']);

    dataRegistryErrorsPage.shouldShowConnectionError();
    dataRegistryErrorsPage.shouldShowRetryButton();
    dataRegistryErrorsPage.testA11y();
  });

  it('should retry and load data after 503 error', () => {
    interceptRegistryData();
    cy.intercept(
      'GET',
      COLLECTIONS_API,
      registryError(503, 'the upstream service is unavailable'),
    ).as('collections503');

    dataRegistryErrorsPage.visit(TEST_PROJECT);
    cy.wait('@projectNamespaces');
    cy.wait('@collections503').its('response.statusCode').should('eq', 503);

    dataRegistryErrorsPage.shouldShowServiceUnavailable();
    cy.intercept('GET', COLLECTIONS_API, { body: { namespaces: [[COLLECTION]] } }).as(
      'collectionsRetry',
    );
    dataRegistryErrorsPage.clickRetryButton();

    cy.wait('@collectionsRetry').its('response.statusCode').should('eq', 200);
    dataRegistryErrorsPage.shouldShowData();
    dataRegistryErrorsPage.testA11y();
  });
});
