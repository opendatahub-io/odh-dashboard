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
  );
  cy.interceptApi('GET /api/:apiVersion/evaluations/jobs', { path: API_VERSION }, []);
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

const prepareRunForm = () => {
  evaluationsPage.findBenchmarkSuitePrimaryAction(sourceCollection.resource.id).click();
  evaluationsPage.findCuratedSuiteRunModal().should('be.visible');
  startEvaluationRunPage
    .findRunDescription()
    .should(
      'contain.text',
      'This benchmark suite will be copied to your project as-is before the evaluation starts.',
    );
  startEvaluationRunPage.findModelPickerToggle().click();
  cy.findByTestId('model-option-external').click();
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
    cy.findByText('Failed to start evaluation and remove copied suite').should('exist');
    cy.findByText(/Cleanup error:/).should('exist');
  });
});
