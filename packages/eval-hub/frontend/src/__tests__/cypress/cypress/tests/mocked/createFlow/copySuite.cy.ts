/* eslint-disable camelcase */
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
});
