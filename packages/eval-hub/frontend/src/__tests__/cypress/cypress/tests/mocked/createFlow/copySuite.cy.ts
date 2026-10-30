/* eslint-disable camelcase */
import { mockModArchResponse } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockEvalHubHealth } from '~/__mocks__/mockEvalHubHealth';
import { mockProvider } from '~/__mocks__/mockProvider';
import { mockBenchmark } from '~/__mocks__/mockBenchmark';
import { mockCollection } from '~/__mocks__/mockCollection';
import { copySuitePage } from '~/__tests__/cypress/cypress/pages/copySuitePage';
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
};

describe('Suite editor benchmark selection', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should select benchmarks on a flat page before configuring a new suite', () => {
    copySuitePage.visitCreate(NAMESPACE);
    copySuitePage.findSuiteNameInput().type('New suite');
    copySuitePage.findSettingsNextButton().should('be.disabled');
    copySuitePage.selectCategory('grounded_document_understanding');
    copySuitePage.findSettingsNextButton().click();

    copySuitePage.findSelectBenchmarksStep().should('exist');
    copySuitePage.findBenchmarkCheckbox('bench-alpha').should('not.be.checked');
    copySuitePage.findSelectBenchmarksNextButton().should('be.disabled');

    copySuitePage.findBenchmarkName('bench-alpha').click();
    copySuitePage.findDetailsDrawer().should('exist');
    copySuitePage.findDetailsDrawer().findByTestId('select-benchmark-button').click();

    copySuitePage.findSelectBenchmarksNextButton().click();
    copySuitePage.findConfigurationStep().should('exist');
  });

  it('should preserve existing copy selections and discard staged changes on Back', () => {
    cy.interceptApi(
      'GET /api/:apiVersion/evaluations/collections/:collectionId',
      { path: { ...API_VERSION, collectionId: 'source-suite' } },
      {
        ...sourceCollection,
        benchmarks: [{ id: 'bench-alpha', provider_id: 'test-provider' }],
      },
    );

    copySuitePage.visitCopy(NAMESPACE, 'source-suite');
    copySuitePage.findSettingsNextButton().click();

    copySuitePage.findBenchmarkCheckbox('bench-alpha').should('be.checked');
    copySuitePage.findBenchmarkCheckbox('bench-beta').click();
    copySuitePage.findSelectBenchmarksBackButton().click();
    copySuitePage.findSettingsNextButton().click();

    copySuitePage.findBenchmarkCheckbox('bench-alpha').should('be.checked');
    copySuitePage.findBenchmarkCheckbox('bench-beta').should('not.be.checked');
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

    copySuitePage.visitEdit(NAMESPACE, sourceCollection.resource.id);
    copySuitePage.findSuiteNameInput().clear().type('Updated suite');
    copySuitePage.findSettingsNextButton().click();
    copySuitePage.findBenchmarkCheckbox('bench-alpha').should('be.checked');
    copySuitePage.findSelectBenchmarksNextButton().click();
    copySuitePage.findConfigurationStep().should('be.visible');
    copySuitePage.findSaveOnlyButton().click();

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

describe('Suite editor curated collection prerequisites', () => {
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

    copySuitePage.visitCopy(NAMESPACE, 'trustworthiness-v1');
    copySuitePage.findSettingsNextButton().click();

    copySuitePage.findBenchmarkCheckbox('bench-alpha').should('be.checked');
    copySuitePage.findSelectBenchmarksNextButton().click();
    copySuitePage.findConfigurationStep().should('exist');

    // The judge model field comes from the source benchmark's parameters, and the
    // validation error only surfaces after the field is edited.
    copySuitePage.findBenchmarkParameterInput(0, 'judge_model').should('have.value', '');
    copySuitePage.findBenchmarkParameterError(0, 'judge_model').should('not.exist');
    copySuitePage.findSaveOnlyButton().should('be.disabled');

    copySuitePage.findBenchmarkParameterInput(0, 'judge_model').type('gpt-4o');
    copySuitePage.findBenchmarkParameterError(0, 'judge_model').should('not.exist');

    copySuitePage.findBenchmarkParameterInput(0, 'judge_model').clear();
    copySuitePage
      .findBenchmarkParameterError(0, 'judge_model')
      .should('contain.text', 'Judge model is required.');
    copySuitePage.findSaveOnlyButton().should('be.disabled');

    copySuitePage.findBenchmarkParameterInput(0, 'judge_model').type('gpt-4o');
    copySuitePage.findBenchmarkParameterError(0, 'judge_model').should('not.exist');
    copySuitePage.findSaveOnlyButton().should('be.enabled').click();

    cy.wait('@cloneCuratedSuite').then((interception) => {
      expect(interception.request.body.benchmarks[0].parameters).to.deep.include({
        judge_model: 'gpt-4o',
      });
    });
    cy.url().should('include', `/evaluation/${NAMESPACE}/collections`);
  });
});
