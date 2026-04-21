/* eslint-disable camelcase */
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockEvalHubHealth } from '~/__mocks__/mockEvalHubHealth';
import { mockProvider } from '~/__mocks__/mockProvider';
import { mockBenchmark } from '~/__mocks__/mockBenchmark';
import { mockCollectionsListResponse } from '~/__mocks__/mockCollection';
import { chooseBenchmarkPage } from '~/__tests__/cypress/cypress/pages/chooseBenchmarkPage';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';
import type { Provider } from '~/app/types';

const NAMESPACE = 'test-namespace';
const API_VERSION = { apiVersion: CLIENT_API_VERSION };

type InterceptOptions = {
  providers?: Provider[];
};

const initIntercepts = ({ providers = [] }: InterceptOptions = {}) => {
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

  cy.interceptApi('GET /api/:apiVersion/evaluations/providers', { path: API_VERSION }, providers);

  cy.interceptApi(
    'GET /api/:apiVersion/evaluations/collections',
    { path: API_VERSION },
    mockCollectionsListResponse([]),
  );
};

const testProvider = mockProvider({
  id: 'test-provider',
  name: 'test-provider',
  title: 'Test Provider',
  benchmarks: [
    mockBenchmark({
      id: 'bench-alpha',
      name: 'Alpha Bench',
      category: 'Reasoning',
      metrics: ['accuracy', 'f1'],
      description: 'Alpha benchmark description',
    }),
    mockBenchmark({
      id: 'bench-beta',
      name: 'Beta Bench',
      category: 'Safety',
      metrics: ['toxicity'],
      description: 'Beta benchmark description',
    }),
  ],
});

const secondProvider = mockProvider({
  id: 'second-provider',
  name: 'second-provider',
  title: 'Second Provider',
  benchmarks: [
    mockBenchmark({
      id: 'bench-gamma',
      name: 'Gamma Bench',
      category: 'Reasoning',
      metrics: ['accuracy'],
    }),
  ],
});

describe('Choose Benchmark Page', () => {
  beforeEach(() => {
    initIntercepts({ providers: [testProvider, secondProvider] });
  });

  it('should display provider benchmarks in the gallery', () => {
    chooseBenchmarkPage.visit(NAMESPACE);
    chooseBenchmarkPage.findTitle().should('contain.text', 'Single benchmark');
    chooseBenchmarkPage.findBenchmarksGallery().should('exist');
    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-alpha').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-beta').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('second-provider', 'bench-gamma').should('exist');
  });

  it('should filter benchmarks by name', () => {
    chooseBenchmarkPage.visit(NAMESPACE);
    chooseBenchmarkPage.findBenchmarksFilterToolbar().should('exist');

    chooseBenchmarkPage.selectFilterOption('Name');
    chooseBenchmarkPage.findNameFilterInput().type('Alpha');

    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-alpha').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-beta').should('not.exist');
    chooseBenchmarkPage.findBenchmarkCard('second-provider', 'bench-gamma').should('not.exist');
  });

  it('should show empty state when filters match nothing', () => {
    chooseBenchmarkPage.visit(NAMESPACE);

    chooseBenchmarkPage.selectFilterOption('Name');
    chooseBenchmarkPage.findNameFilterInput().type('nonexistent');

    chooseBenchmarkPage.findBenchmarksEmptyState().should('exist');
    chooseBenchmarkPage.findBenchmarksEmptyState().should('contain.text', 'No benchmarks found');
    chooseBenchmarkPage.findClearFiltersButton().should('exist');

    chooseBenchmarkPage.findClearFiltersButton().click();
    chooseBenchmarkPage.findBenchmarksGallery().should('exist');
  });

  it('should open and close the benchmark drawer panel', () => {
    chooseBenchmarkPage.visit(NAMESPACE);

    chooseBenchmarkPage
      .findBenchmarkCard('test-provider', 'bench-alpha')
      .findByText('Alpha Bench')
      .click();

    chooseBenchmarkPage.findBenchmarkDrawerPanel().should('exist');
    chooseBenchmarkPage.findBenchmarkDrawerPanel().should('contain.text', 'Alpha Bench');

    chooseBenchmarkPage
      .findBenchmarkDrawerPanel()
      .findByRole('button', { name: 'Close drawer panel' })
      .click();
    chooseBenchmarkPage.findBenchmarkDrawerPanel().should('not.exist');
  });

  it('should navigate to start page when clicking "Use this benchmark"', () => {
    chooseBenchmarkPage.visit(NAMESPACE);

    chooseBenchmarkPage
      .findBenchmarkCard('test-provider', 'bench-alpha')
      .findByText('Use this benchmark')
      .click();

    cy.url().should('include', `${NAMESPACE}/create/start`);
    cy.url().should('include', 'type=benchmark');
    cy.url().should('include', 'providerId=test-provider');
    cy.url().should('include', 'benchmarkId=bench-alpha');
  });
});

describe('Choose Benchmark Page - Pagination', () => {
  it('should paginate when benchmarks exceed per-page limit', () => {
    const manyBenchmarks = Array.from({ length: 15 }, (_, i) =>
      mockBenchmark({
        id: `bench-${i}`,
        name: `Benchmark ${i}`,
        category: i % 2 === 0 ? 'Reasoning' : 'Safety',
      }),
    );

    const bulkProvider = mockProvider({
      id: 'bulk-provider',
      name: 'bulk-provider',
      title: 'Bulk Provider',
      benchmarks: manyBenchmarks,
    });

    initIntercepts({ providers: [bulkProvider] });
    chooseBenchmarkPage.visit(NAMESPACE);

    chooseBenchmarkPage.findBenchmarksGallery().should('exist');
    chooseBenchmarkPage.findBenchmarkCard('bulk-provider', 'bench-0').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('bulk-provider', 'bench-9').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('bulk-provider', 'bench-10').should('not.exist');

    chooseBenchmarkPage.findNextPageButton().click();
    chooseBenchmarkPage.findBenchmarkCard('bulk-provider', 'bench-10').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('bulk-provider', 'bench-14').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('bulk-provider', 'bench-0').should('not.exist');
  });
});

describe('Choose Benchmark Page - Empty', () => {
  it('should show empty state when no providers exist', () => {
    initIntercepts({ providers: [] });
    chooseBenchmarkPage.visit(NAMESPACE);

    chooseBenchmarkPage.findBenchmarksEmptyState().should('exist');
    chooseBenchmarkPage.findBenchmarksEmptyState().should('contain.text', 'No benchmarks');
  });
});
/* eslint-enable camelcase */
