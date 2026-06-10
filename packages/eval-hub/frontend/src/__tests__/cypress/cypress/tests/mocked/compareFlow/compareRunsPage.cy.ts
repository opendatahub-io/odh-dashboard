/* eslint-disable camelcase */
import type { Namespace } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockEvalHubHealth } from '~/__mocks__/mockEvalHubHealth';
import { mockCollectionsListResponse } from '~/__mocks__/mockCollection';
import { compareRunsPage } from '~/__tests__/cypress/cypress/pages/compareRunsPage';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';
import type { EvalHubHealthResponse } from '~/app/types';

const NAMESPACE = 'test-namespace';
const API_VERSION = { apiVersion: CLIENT_API_VERSION };

type InterceptOptions = {
  namespaces?: Namespace[];
  health?: EvalHubHealthResponse;
};

const initIntercepts = ({
  namespaces = [mockNamespace({ name: NAMESPACE })],
  health = mockEvalHubHealth(),
}: InterceptOptions = {}) => {
  cy.interceptApi(
    'GET /api/:apiVersion/user',
    { path: API_VERSION },
    mockUserSettings({ userId: 'test-user' }),
  );
  cy.interceptApi('GET /api/:apiVersion/namespaces', { path: API_VERSION }, namespaces);
  cy.interceptApi('GET /api/:apiVersion/evalhub/health', { path: API_VERSION }, health);
  cy.interceptApi(
    'GET /api/:apiVersion/evaluations/collections',
    { path: API_VERSION },
    mockCollectionsListResponse([]),
  );
};

describe('Compare Runs Page - Empty states', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should show the empty message when no runs or experiments are provided', () => {
    compareRunsPage.visit(NAMESPACE);
    compareRunsPage.findTitle().should('contain.text', 'Compare runs');
    compareRunsPage.findEmptyStateMessage().should('exist');
  });

  it('should show the empty message when only one run/experiment pair is provided', () => {
    compareRunsPage.visit(NAMESPACE, {
      runs: ['run-uuid-1'],
      experiments: ['exp-id-1'],
    });
    compareRunsPage.findEmptyStateMessage().should('exist');
  });
});

describe('Compare Runs Page - Titles', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should show the default "Compare runs" title when no names are provided', () => {
    compareRunsPage.visit(NAMESPACE, {
      runs: ['run-1', 'run-2'],
      experiments: ['exp-1', 'exp-2'],
    });
    compareRunsPage.findTitle().should('have.text', 'Compare runs');
  });

  it('should show "Comparing X and Y" when two run names are provided', () => {
    compareRunsPage.visit(NAMESPACE, {
      runs: ['run-1', 'run-2'],
      experiments: ['exp-1', 'exp-2'],
      names: ['GPT4 Eval', 'Claude Eval'],
    });
    compareRunsPage.findTitle().should('have.text', 'Comparing GPT4 Eval and Claude Eval');
  });

  it('should show "Comparing X, Y and N more" when three or more run names are provided', () => {
    compareRunsPage.visit(NAMESPACE, {
      runs: ['run-1', 'run-2', 'run-3'],
      experiments: ['exp-1', 'exp-2', 'exp-3'],
      names: ['GPT4 Eval', 'Claude Eval', 'Llama Eval'],
    });
    compareRunsPage.findTitle().should('contain.text', 'Comparing GPT4 Eval, Claude Eval and');
    compareRunsPage.findTitle().should('contain.text', 'more');
  });
});
/* eslint-enable camelcase */
