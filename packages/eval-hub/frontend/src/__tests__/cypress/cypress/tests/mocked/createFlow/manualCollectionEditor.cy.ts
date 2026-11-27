/* eslint-disable camelcase */
import { mockModArchResponse } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockEvalHubHealth } from '~/__mocks__/mockEvalHubHealth';
import { mockProvider } from '~/__mocks__/mockProvider';
import { mockBenchmark } from '~/__mocks__/mockBenchmark';
import { mockCollection } from '~/__mocks__/mockCollection';
import { manualCollectionEditorPage } from '~/__tests__/cypress/cypress/pages/manualCollectionEditorPage';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';

const NAMESPACE = 'test-namespace';
const API_VERSION = { apiVersion: CLIENT_API_VERSION };

const provider = mockProvider({
  id: 'test-provider',
  name: 'test-provider',
  title: 'Test provider',
  benchmarks: [
    mockBenchmark({
      id: 'bench-alpha',
      name: 'Alpha benchmark',
      category: 'Reasoning',
      metrics: ['accuracy'],
    }),
    mockBenchmark({
      id: 'bench-beta',
      name: 'Beta benchmark',
      category: 'Safety',
      metrics: ['toxicity'],
    }),
  ],
});

const sourceCollection = mockCollection({
  id: 'source-suite',
  name: 'Source suite',
  domains: ['trustworthiness'],
  benchmarkIds: ['bench-alpha'],
});

const initIntercepts = () => {
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
  cy.interceptApi('GET /api/:apiVersion/evaluations/providers', { path: API_VERSION }, [provider]);
  cy.interceptApi(
    'GET /api/:apiVersion/evaluations/collection-imports/access',
    { path: API_VERSION },
    { allowed: true },
  );
};

describe('Manual collection editor benchmark selection', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should select benchmarks on a flat page before configuring a new suite', () => {
    manualCollectionEditorPage.visitCreate(NAMESPACE);
    cy.testA11y();
    manualCollectionEditorPage.findCollectionNameInput().type('New suite');
    manualCollectionEditorPage.findSettingsNextButton().should('be.disabled');
    manualCollectionEditorPage.selectCategory('grounded_document_understanding');
    manualCollectionEditorPage.findSettingsNextButton().click();

    manualCollectionEditorPage.findSelectBenchmarksStep().should('exist');
    cy.testA11y();
    manualCollectionEditorPage.findBenchmarkCheckbox('bench-alpha').should('not.be.checked');
    manualCollectionEditorPage.findSelectBenchmarksNextButton().should('be.disabled');

    manualCollectionEditorPage.findBenchmarkName('bench-alpha').click();
    manualCollectionEditorPage.findDetailsDrawer().should('exist');
    manualCollectionEditorPage.findSelectBenchmarkButton().click();

    manualCollectionEditorPage.findSelectBenchmarksNextButton().click();
    manualCollectionEditorPage.findConfigurationStep().should('exist');
    cy.testA11y();
  });

  it('should preserve existing selections when returning to Benchmarks after Back', () => {
    cy.interceptApi(
      'GET /api/:apiVersion/evaluations/collections/:collectionId',
      { path: { ...API_VERSION, collectionId: 'source-suite' } },
      {
        ...sourceCollection,
        benchmarks: [{ id: 'bench-alpha', provider_id: 'test-provider' }],
      },
    );

    manualCollectionEditorPage.visitCopy(NAMESPACE, 'source-suite');
    manualCollectionEditorPage.findSettingsNextButton().click();

    manualCollectionEditorPage.findBenchmarkCheckbox('bench-alpha').should('be.checked');
    manualCollectionEditorPage.findBenchmarkCheckbox('bench-beta').click();
    manualCollectionEditorPage.findSelectBenchmarksBackButton().click();
    manualCollectionEditorPage.findSettingsNextButton().click();

    manualCollectionEditorPage.findBenchmarkCheckbox('bench-alpha').should('be.checked');
    manualCollectionEditorPage.findBenchmarkCheckbox('bench-beta').should('be.checked');
  });

  it('should update an existing suite through the edit flow', () => {
    cy.interceptApi(
      'GET /api/:apiVersion/evaluations/collections/:collectionId',
      { path: { ...API_VERSION, collectionId: sourceCollection.resource.id } },
      sourceCollection,
    );
    cy.intercept(
      {
        method: 'PATCH',
        pathname: `/eval-hub/api/v1/evaluations/collections/${sourceCollection.resource.id}`,
      },
      {
        statusCode: 200,
        body: mockModArchResponse({ ...sourceCollection, name: 'Updated suite' }),
      },
    ).as('updateSuite');

    manualCollectionEditorPage.visitEdit(NAMESPACE, sourceCollection.resource.id);
    manualCollectionEditorPage.findCollectionNameInput().clear().type('Updated suite');
    manualCollectionEditorPage.findSettingsNextButton().click();
    manualCollectionEditorPage.findBenchmarkCheckbox('bench-alpha').should('be.checked');
    manualCollectionEditorPage.findSelectBenchmarksNextButton().click();
    manualCollectionEditorPage.findConfigurationStep().should('be.visible');
    manualCollectionEditorPage.selectBenchmarkMetric(0, 'Accuracy');
    manualCollectionEditorPage.findNextReviewButton().click();
    manualCollectionEditorPage.findReviewStep().should('be.visible');
    cy.testA11y();
    manualCollectionEditorPage.findSaveOnlyButton().click();

    cy.wait('@updateSuite').then((interception) => {
      expect(interception.request.body).to.deep.include({
        op: 'replace',
        path: '/name',
        value: 'Updated suite',
      });
    });
    cy.url().should('include', `/evaluation/${NAMESPACE}/collections`);
  });
});

describe('Manual collection editor benchmark test data', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should configure an s3 test data ref on a benchmark and send it in the clone request', () => {
    cy.interceptApi(
      'GET /api/:apiVersion/evaluations/collections/:collectionId',
      { path: { ...API_VERSION, collectionId: 'source-suite' } },
      {
        ...sourceCollection,
        benchmarks: [{ id: 'bench-alpha', provider_id: 'test-provider' }],
      },
    );
    cy.intercept(
      {
        method: 'POST',
        pathname: '/eval-hub/api/v1/evaluations/collections/source-suite/clones',
      },
      {
        statusCode: 201,
        body: mockModArchResponse({
          ...sourceCollection,
          resource: { ...sourceCollection.resource, id: 'source-suite-copy' },
        }),
      },
    ).as('cloneSuite');

    manualCollectionEditorPage.visitCopy(NAMESPACE, 'source-suite');
    manualCollectionEditorPage.findSettingsNextButton().click();
    manualCollectionEditorPage.findSelectBenchmarksNextButton().click();
    manualCollectionEditorPage.findConfigurationStep().should('be.visible');

    manualCollectionEditorPage
      .findBenchmarkTestDataRefSourceToggle(0)
      .should('contain.text', 'None (use benchmark default data)');

    manualCollectionEditorPage.findBenchmarkTestDataRefSourceToggle(0).click();
    manualCollectionEditorPage.findBenchmarkTestDataRefOption('S3 — object storage').click();

    manualCollectionEditorPage.findBenchmarkTestDataRefField(0, 'bucket').type('eval-data');
    manualCollectionEditorPage.findBenchmarkTestDataRefField(0, 'key').type('ragas/dataset.jsonl');
    manualCollectionEditorPage.findBenchmarkTestDataRefField(0, 'secretRef').type('my-s3-secret');
    manualCollectionEditorPage.selectBenchmarkMetric(0, 'Accuracy');
    manualCollectionEditorPage.findNextReviewButton().click();
    manualCollectionEditorPage.findReviewStep().should('be.visible');

    manualCollectionEditorPage.findSaveOnlyButton().should('be.enabled').click();

    cy.wait('@cloneSuite').then((interception) => {
      expect(interception.request.body.benchmarks[0].test_data_ref).to.deep.equal({
        type: 'data_set',
        s3: {
          bucket: 'eval-data',
          key: 'ragas/dataset.jsonl',
          secret_ref: 'my-s3-secret',
        },
      });
    });
  });

  it('should block submission when required test data fields are empty', () => {
    cy.interceptApi(
      'GET /api/:apiVersion/evaluations/collections/:collectionId',
      { path: { ...API_VERSION, collectionId: 'source-suite' } },
      {
        ...sourceCollection,
        benchmarks: [{ id: 'bench-alpha', provider_id: 'test-provider' }],
      },
    );

    manualCollectionEditorPage.visitCopy(NAMESPACE, 'source-suite');
    manualCollectionEditorPage.findSettingsNextButton().click();
    manualCollectionEditorPage.findSelectBenchmarksNextButton().click();
    manualCollectionEditorPage.findConfigurationStep().should('be.visible');
    manualCollectionEditorPage.selectBenchmarkMetric(0, 'Accuracy');

    manualCollectionEditorPage.findBenchmarkTestDataRefSourceToggle(0).click();
    manualCollectionEditorPage.findBenchmarkTestDataRefOption('S3 — object storage').click();

    manualCollectionEditorPage.findBenchmarkTestDataRefField(0, 'bucket').type('eval-data');
    manualCollectionEditorPage
      .findBenchmarkTestDataRefField(0, 'key')
      .type('ragas/dataset.jsonl')
      .clear();
    manualCollectionEditorPage
      .findBenchmarkTestDataRefField(0, 'secretRef')
      .type('my-secret')
      .clear();

    manualCollectionEditorPage
      .findBenchmarkTestDataRefFieldError(0, 'key')
      .should('contain.text', 'Key is required.');
    manualCollectionEditorPage.findNextReviewButton().should('be.disabled');
  });
});

describe('Manual collection editor curated collection prerequisites', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should require a judge model when customizing a curated collection', () => {
    const curatedCollection = mockCollection({
      id: 'trustworthiness-v1',
      name: 'Trustworthiness Suite',
      domains: ['trustworthiness'],
      benchmarkIds: ['bench-alpha'],
      judgeModel: true,
    });
    cy.interceptApi(
      'GET /api/:apiVersion/evaluations/collections/:collectionId',
      { path: { ...API_VERSION, collectionId: 'trustworthiness-v1' } },
      curatedCollection,
    );
    cy.intercept(
      {
        method: 'POST',
        pathname: '/eval-hub/api/v1/evaluations/collections/trustworthiness-v1/clones',
      },
      {
        statusCode: 201,
        body: mockModArchResponse({
          ...curatedCollection,
          resource: { ...curatedCollection.resource, id: 'trustworthiness-copy' },
        }),
      },
    ).as('cloneCuratedSuite');

    manualCollectionEditorPage.visitCopy(NAMESPACE, 'trustworthiness-v1');
    manualCollectionEditorPage.findSettingsNextButton().click();

    manualCollectionEditorPage.findBenchmarkCheckbox('bench-alpha').should('be.checked');
    manualCollectionEditorPage.findSelectBenchmarksNextButton().click();
    manualCollectionEditorPage.findConfigurationStep().should('exist');
    manualCollectionEditorPage.selectBenchmarkMetric(0, 'Accuracy');

    // The judge model field comes from the source benchmark's parameters, and the
    // validation error only surfaces after the field is edited.
    manualCollectionEditorPage
      .findBenchmarkParameterInput(0, 'judge_model')
      .should('have.value', '');
    manualCollectionEditorPage.findBenchmarkParameterError(0, 'judge_model').should('not.exist');
    manualCollectionEditorPage.findNextReviewButton().should('be.disabled');

    manualCollectionEditorPage.findBenchmarkParameterInput(0, 'judge_model').type('gpt-4o');
    manualCollectionEditorPage.findBenchmarkParameterError(0, 'judge_model').should('not.exist');

    manualCollectionEditorPage.findBenchmarkParameterInput(0, 'judge_model').clear();
    manualCollectionEditorPage
      .findBenchmarkParameterError(0, 'judge_model')
      .should('contain.text', 'Judge model is required.');
    manualCollectionEditorPage.findNextReviewButton().should('be.disabled');

    manualCollectionEditorPage.findBenchmarkParameterInput(0, 'judge_model').type('gpt-4o');
    manualCollectionEditorPage.findBenchmarkParameterError(0, 'judge_model').should('not.exist');
    manualCollectionEditorPage.findNextReviewButton().should('be.enabled').click();
    manualCollectionEditorPage.findReviewStep().should('be.visible');
    manualCollectionEditorPage.findSaveOnlyButton().should('be.enabled').click();

    cy.wait('@cloneCuratedSuite').then((interception) => {
      expect(interception.request.body.benchmarks[0].parameters).to.deep.include({
        judge_model: 'gpt-4o',
      });
    });
    cy.url().should('include', `/evaluation/${NAMESPACE}/collections`);
  });
});
