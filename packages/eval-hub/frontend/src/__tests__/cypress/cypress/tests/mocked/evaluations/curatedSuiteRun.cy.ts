/* eslint-disable camelcase */
import { mockModArchResponse } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockEvalHubHealth } from '~/__mocks__/mockEvalHubHealth';
import { mockEvaluationJob } from '~/__mocks__/mockEvaluationJob';
import { mockKueueAvailability } from '~/__mocks__/mockKueueAvailability';
import {
  mockCollectionsListResponse,
  mockCuratedBenchmarkSuiteCollections,
} from '~/__mocks__/mockCollection';
import { evaluationsPage } from '~/__tests__/cypress/cypress/pages/evaluationsPage';
import { startEvaluationRunPage } from '~/__tests__/cypress/cypress/pages/startEvaluationRunPage';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';
import type { Collection } from '~/app/types';

const NAMESPACE = 'test-namespace';
const API_VERSION = { apiVersion: CLIENT_API_VERSION };
const sourceCollection = mockCuratedBenchmarkSuiteCollections('model')[0];

const setupIntercepts = () => {
  cy.interceptApi(
    'GET /api/:apiVersion/user',
    { path: API_VERSION },
    mockUserSettings({ userId: 'test-user' }),
  );
  cy.interceptApi('GET /api/:apiVersion/namespaces', { path: API_VERSION }, [
    mockNamespace({ name: NAMESPACE }),
  ]);
  cy.interceptApi(
    'GET /api/:apiVersion/evalhub/health',
    { path: API_VERSION },
    mockEvalHubHealth(),
  ).as('evalHubHealth');
  cy.interceptApi('GET /api/:apiVersion/evaluations/jobs', { path: API_VERSION }, []).as(
    'evalHubJobs',
  );
  cy.interceptApi(
    'GET /api/:apiVersion/evaluations/collections',
    { path: API_VERSION },
    mockCollectionsListResponse(mockCuratedBenchmarkSuiteCollections()),
  );
  cy.interceptApi('GET /api/:apiVersion/evaluations/providers', { path: API_VERSION }, []);
  cy.interceptApi(
    'GET /api/:apiVersion/kueue/availability',
    { path: API_VERSION },
    mockKueueAvailability(),
  );
  cy.interceptApi('GET /api/:apiVersion/hardwareprofiles', { path: API_VERSION }, { items: [] });
  cy.interceptApi('GET /api/:apiVersion/inferenceservices', { path: API_VERSION }, { items: [] });
  cy.intercept('GET', '/_bff/mlflow/api/v1/experiments*', {
    body: { data: { experiments: [] } },
  });
  cy.interceptApi(
    'POST /api/:apiVersion/evaluations/verify-connection',
    { path: API_VERSION },
    {
      success: true,
      message: 'Connection established successfully.',
      response_time_ms: 120,
      openai_compatible: true,
    },
  ).as('verifyConnection');
};

const copiedCollection: Collection = {
  ...sourceCollection,
  resource: { ...sourceCollection.resource, id: 'curated-suite-copy' },
};

const reusableCollection: Collection = {
  ...sourceCollection,
  resource: { ...sourceCollection.resource, id: 'curated-suite-existing-copy' },
  curation_order: undefined,
  state: {
    derived_from: sourceCollection.resource.id,
    run_count: 2,
  },
};

const interceptTenantCollections = (collections: Collection[]) => {
  cy.interceptApi(
    'GET /api/:apiVersion/evaluations/collections',
    {
      path: API_VERSION,
      query: {
        namespace: NAMESPACE,
        scope: 'tenant',
        limit: '100',
        offset: '0',
      },
    },
    mockCollectionsListResponse(collections),
  ).as('findTenantCollections');
};

const prepareRunForm = () => {
  evaluationsPage.findBenchmarkSuitePrimaryAction(sourceCollection.resource.id).click();
  evaluationsPage.findCuratedSuiteRunModal().should('be.visible');
  startEvaluationRunPage
    .findRunDescription()
    .should(
      'contain.text',
      'An unchanged copy of this benchmark suite will be reused if one already exists in your project; otherwise, it will be copied before the evaluation starts.',
    );
  startEvaluationRunPage.findModelPickerToggle().click();
  startEvaluationRunPage.findExternalModelOption().click();
  startEvaluationRunPage.findModelNameInput().type('my-model');
  startEvaluationRunPage.findEndpointUrlInput().type('https://api.example.com/v1');
  startEvaluationRunPage.findValidateConnectionButton().click();
};

describe('Curated benchmark suite Run CTA', () => {
  beforeEach(() => {
    setupIntercepts();
    evaluationsPage.visitGallery(NAMESPACE);
  });

  it('should copy without overrides and run against the copied collection', () => {
    cy.intercept(
      {
        method: 'POST',
        pathname: `/eval-hub/api/v1/evaluations/collections/${sourceCollection.resource.id}/clones`,
      },
      { statusCode: 201, body: mockModArchResponse(copiedCollection) },
    ).as('cloneCuratedSuite');
    cy.interceptApi(
      'POST /api/:apiVersion/evaluations/jobs',
      { path: API_VERSION },
      mockEvaluationJob({ id: 'curated-suite-run', collectionId: copiedCollection.resource.id }),
    ).as('createCuratedSuiteRun');

    prepareRunForm();
    cy.wait('@verifyConnection');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@cloneCuratedSuite').then((interception) => {
      expect(interception.request.body).to.deep.equal({});
    });
    cy.wait('@createCuratedSuiteRun').then((interception) => {
      expect(interception.request.body.collection.id).to.equal(copiedCollection.resource.id);
      expect(interception.request.body.collection.id).not.to.equal(sourceCollection.resource.id);
    });
    cy.url().should('include', `/evaluation/${NAMESPACE}?tab=runs`);
  });

  it('should reuse an unchanged copy and run against the existing collection', () => {
    interceptTenantCollections([reusableCollection]);
    cy.intercept(
      {
        method: 'POST',
        pathname: `/eval-hub/api/v1/evaluations/collections/${sourceCollection.resource.id}/clones`,
      },
      { statusCode: 500, body: { message: 'Unexpected clone request' } },
    ).as('unexpectedClone');
    cy.interceptApi(
      'POST /api/:apiVersion/evaluations/jobs',
      { path: API_VERSION },
      mockEvaluationJob({ id: 'reused-suite-run', collectionId: reusableCollection.resource.id }),
    ).as('createReusedSuiteRun');

    prepareRunForm();
    cy.wait('@verifyConnection');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@findTenantCollections');
    cy.wait('@createReusedSuiteRun').then((interception) => {
      expect(interception.request.body.collection.id).to.equal(reusableCollection.resource.id);
    });
    cy.get('@unexpectedClone.all').should('have.length', 0);
  });

  it('should clone when an existing child has been customized', () => {
    interceptTenantCollections([
      {
        ...reusableCollection,
        description: 'Customized suite description',
      },
    ]);
    cy.intercept(
      {
        method: 'POST',
        pathname: `/eval-hub/api/v1/evaluations/collections/${sourceCollection.resource.id}/clones`,
      },
      { statusCode: 201, body: mockModArchResponse(copiedCollection) },
    ).as('cloneCustomizedSuite');
    cy.interceptApi(
      'POST /api/:apiVersion/evaluations/jobs',
      { path: API_VERSION },
      mockEvaluationJob({ id: 'customized-suite-run', collectionId: copiedCollection.resource.id }),
    ).as('createCustomizedSuiteRun');

    prepareRunForm();
    cy.wait('@verifyConnection');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@findTenantCollections');
    cy.wait('@cloneCustomizedSuite');
    cy.wait('@createCustomizedSuiteRun');
  });

  it('should delete the copied collection when run creation fails', () => {
    cy.intercept(
      {
        method: 'POST',
        pathname: `/eval-hub/api/v1/evaluations/collections/${sourceCollection.resource.id}/clones`,
      },
      { statusCode: 201, body: mockModArchResponse(copiedCollection) },
    ).as('cloneCuratedSuite');
    cy.intercept(
      { method: 'POST', pathname: '/eval-hub/api/v1/evaluations/jobs' },
      { statusCode: 500, body: { message: 'Internal server error' } },
    ).as('createCuratedSuiteRun');
    cy.intercept(
      {
        method: 'DELETE',
        pathname: `/eval-hub/api/v1/evaluations/collections/${copiedCollection.resource.id}`,
      },
      { statusCode: 204, body: '' },
    ).as('deleteCopiedSuite');

    prepareRunForm();
    cy.wait('@verifyConnection');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@cloneCuratedSuite');
    cy.wait('@createCuratedSuiteRun');
    cy.wait('@deleteCopiedSuite');
    startEvaluationRunPage.findForm().should('exist');
    startEvaluationRunPage.findSubmitButton().should('be.enabled');
  });

  it('should keep the copied collection and report cleanup failure', () => {
    cy.intercept(
      {
        method: 'POST',
        pathname: `/eval-hub/api/v1/evaluations/collections/${sourceCollection.resource.id}/clones`,
      },
      { statusCode: 201, body: mockModArchResponse(copiedCollection) },
    ).as('cloneCuratedSuite');
    cy.intercept(
      { method: 'POST', pathname: '/eval-hub/api/v1/evaluations/jobs' },
      { statusCode: 500, body: { message: 'Internal server error' } },
    ).as('createCuratedSuiteRun');
    cy.intercept(
      {
        method: 'DELETE',
        pathname: `/eval-hub/api/v1/evaluations/collections/${copiedCollection.resource.id}`,
      },
      { statusCode: 500, body: { message: 'Delete failed' } },
    ).as('deleteCopiedSuite');

    prepareRunForm();
    cy.wait('@verifyConnection');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait(['@cloneCuratedSuite', '@createCuratedSuiteRun', '@deleteCopiedSuite']);
    startEvaluationRunPage
      .findNotificationTitle('Failed to start evaluation and remove copied suite')
      .should('exist');
    startEvaluationRunPage.findNotificationMessage(/Cleanup error:/).should('exist');
  });

  it('should preserve a reused collection when run creation fails', () => {
    interceptTenantCollections([reusableCollection]);
    cy.intercept(
      {
        method: 'POST',
        pathname: `/eval-hub/api/v1/evaluations/collections/${sourceCollection.resource.id}/clones`,
      },
      { statusCode: 500, body: { message: 'Unexpected clone request' } },
    ).as('unexpectedClone');
    cy.intercept(
      { method: 'POST', pathname: '/eval-hub/api/v1/evaluations/jobs' },
      { statusCode: 500, body: { error: { message: 'Internal server error' } } },
    ).as('reusedRunFailure');
    cy.intercept(
      {
        method: 'DELETE',
        pathname: `/eval-hub/api/v1/evaluations/collections/${reusableCollection.resource.id}`,
      },
      { statusCode: 500, body: { message: 'Unexpected delete request' } },
    ).as('unexpectedDelete');

    prepareRunForm();
    cy.wait('@verifyConnection');
    cy.clock();
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@findTenantCollections');
    cy.wait('@reusedRunFailure');
    startEvaluationRunPage.findNotificationTitle('Failed to start evaluation').should('exist');
    cy.get('@unexpectedClone.all').should('have.length', 0);
    cy.get('@unexpectedDelete.all').should('have.length', 0);
  });

  it('should fail closed when the existing-copy lookup fails', () => {
    cy.intercept(
      {
        method: 'GET',
        pathname: '/eval-hub/api/v1/evaluations/collections',
        query: {
          namespace: NAMESPACE,
          scope: 'tenant',
          limit: '100',
          offset: '0',
        },
      },
      { statusCode: 500, body: { message: 'Collection lookup failed' } },
    ).as('tenantCollectionsFailure');
    cy.intercept(
      {
        method: 'POST',
        pathname: `/eval-hub/api/v1/evaluations/collections/${sourceCollection.resource.id}/clones`,
      },
      { statusCode: 500, body: { message: 'Unexpected clone request' } },
    ).as('unexpectedClone');
    cy.intercept(
      { method: 'POST', pathname: '/eval-hub/api/v1/evaluations/jobs' },
      { statusCode: 500, body: { message: 'Unexpected job request' } },
    ).as('unexpectedRun');

    prepareRunForm();
    cy.wait('@verifyConnection');
    cy.clock();
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@tenantCollectionsFailure');
    startEvaluationRunPage
      .findNotificationTitle('Failed to find existing suite copy')
      .should('exist');
    cy.get('@unexpectedClone.all').should('have.length', 0);
    cy.get('@unexpectedRun.all').should('have.length', 0);
    startEvaluationRunPage.findSubmitButton().should('be.enabled');
  });
});
