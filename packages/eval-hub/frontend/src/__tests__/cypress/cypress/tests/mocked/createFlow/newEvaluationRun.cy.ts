import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockEvalHubHealth } from '~/__mocks__/mockEvalHubHealth';
import { mockCollectionsListResponse } from '~/__mocks__/mockCollection';
import { newEvaluationRunPage } from '~/__tests__/cypress/cypress/pages/newEvaluationRunPage';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';

const NAMESPACE = 'test-namespace';
const API_VERSION = { apiVersion: CLIENT_API_VERSION };

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

  cy.interceptApi(
    'GET /api/:apiVersion/evaluations/collections',
    { path: API_VERSION },
    mockCollectionsListResponse([]),
  );
};

describe('New Evaluation Run Page', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should render the two evaluation type cards', () => {
    newEvaluationRunPage.visit(NAMESPACE);
    newEvaluationRunPage.findTitle().should('contain.text', 'New evaluation run');
    newEvaluationRunPage.findStandardisedBenchmarksCard().should('exist');
    newEvaluationRunPage
      .findStandardisedBenchmarksCard()
      .should('contain.text', 'Single benchmark');
    newEvaluationRunPage.findCollectionsCard().should('exist');
    newEvaluationRunPage.findCollectionsCard().should('contain.text', 'Benchmark suite');
  });

  it('should navigate to the benchmarks page when clicking Single benchmark', () => {
    newEvaluationRunPage.visit(NAMESPACE);
    newEvaluationRunPage.findStandardisedBenchmarksCard().click();
    cy.url().should('include', `${NAMESPACE}/create/benchmarks`);
  });

  it('should navigate to the collections page when clicking Benchmark suite', () => {
    newEvaluationRunPage.visit(NAMESPACE);
    newEvaluationRunPage.findCollectionsCard().click();
    cy.url().should('include', `${NAMESPACE}/create/collections`);
  });
});
