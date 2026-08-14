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
    chooseBenchmarkPage.findTitle().should('contain.text', 'Select benchmark');
    chooseBenchmarkPage.findBenchmarksGallery().should('exist');
    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-alpha').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-beta').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('second-provider', 'bench-gamma').should('exist');
  });

  it('should filter benchmarks by name', () => {
    chooseBenchmarkPage.visit(NAMESPACE);
    chooseBenchmarkPage.findBenchmarksFilterToolbar().should('exist');

    chooseBenchmarkPage.findNameFilterInput().type('Alpha');

    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-alpha').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-beta').should('not.exist');
    chooseBenchmarkPage.findBenchmarkCard('second-provider', 'bench-gamma').should('not.exist');
  });

  it('should show empty state when filters match nothing', () => {
    chooseBenchmarkPage.visit(NAMESPACE);

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

  it('should navigate to start page when clicking "Select benchmark"', () => {
    chooseBenchmarkPage.visit(NAMESPACE);

    chooseBenchmarkPage
      .findBenchmarkCard('test-provider', 'bench-alpha')
      .findByTestId('select-benchmark-button')
      .click();

    cy.url().should('include', `${NAMESPACE}/create/start`);
    cy.url().should('include', 'type=benchmark');
    cy.url().should('include', 'providerId=test-provider');
    cy.url().should('include', 'benchmarkId=bench-alpha');
  });
});

describe('Choose Benchmark Page - Sort', () => {
  beforeEach(() => {
    initIntercepts({ providers: [testProvider, secondProvider] });
  });

  it('should sort benchmarks alphabetically by name', () => {
    chooseBenchmarkPage.visit(NAMESPACE);
    chooseBenchmarkPage.selectSortOption('name');

    chooseBenchmarkPage
      .findBenchmarksGallery()
      .findAllByTestId(/^benchmark-card-/)
      .first()
      .should('contain.text', 'Alpha Bench');

    chooseBenchmarkPage
      .findBenchmarksGallery()
      .findAllByTestId(/^benchmark-card-/)
      .last()
      .should('contain.text', 'Gamma Bench');
  });

  it('should sort benchmarks by category', () => {
    chooseBenchmarkPage.visit(NAMESPACE);
    chooseBenchmarkPage.selectSortOption('category');

    chooseBenchmarkPage
      .findBenchmarksGallery()
      .findAllByTestId(/^benchmark-card-/)
      .first()
      .should('contain.text', 'Alpha Bench');

    chooseBenchmarkPage
      .findBenchmarksGallery()
      .findAllByTestId(/^benchmark-card-/)
      .last()
      .should('contain.text', 'Beta Bench');
  });
});

describe('Choose Benchmark Page - Category Filter', () => {
  beforeEach(() => {
    initIntercepts({ providers: [testProvider, secondProvider] });
  });

  it('should filter benchmarks by category', () => {
    chooseBenchmarkPage.visit(NAMESPACE);
    chooseBenchmarkPage.selectCategoryOption('Safety');

    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-beta').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-alpha').should('not.exist');
    chooseBenchmarkPage.findBenchmarkCard('second-provider', 'bench-gamma').should('not.exist');
  });

  it('should allow selecting multiple categories', () => {
    chooseBenchmarkPage.visit(NAMESPACE);

    chooseBenchmarkPage.findCategoryFilter().click();
    chooseBenchmarkPage.findCategoryOption('Reasoning').click();
    chooseBenchmarkPage.findCategoryOption('Safety').click();
    chooseBenchmarkPage.findCategoryFilter().click();

    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-alpha').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-beta').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('second-provider', 'bench-gamma').should('exist');
  });

  it('should search within category dropdown', () => {
    chooseBenchmarkPage.visit(NAMESPACE);
    chooseBenchmarkPage.findCategoryFilter().click();

    chooseBenchmarkPage.findCategorySearchInput().type('Reas');

    chooseBenchmarkPage.findCategoryOption('Reasoning').should('exist');
    chooseBenchmarkPage.findCategoryOption('Safety').should('not.exist');
  });

  it('should show badge count on category filter toggle', () => {
    chooseBenchmarkPage.visit(NAMESPACE);
    chooseBenchmarkPage.selectCategoryOption('Reasoning');

    chooseBenchmarkPage.findCategoryFilterBadge().should('have.text', '1');
  });
});

describe('Choose Benchmark Page - Metrics Filter', () => {
  beforeEach(() => {
    initIntercepts({ providers: [testProvider, secondProvider] });
  });

  it('should filter benchmarks by metric', () => {
    chooseBenchmarkPage.visit(NAMESPACE);
    // Metric option test IDs use the raw lowercase value from the benchmark data
    chooseBenchmarkPage.selectMetricsOption('toxicity');

    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-beta').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-alpha').should('not.exist');
    chooseBenchmarkPage.findBenchmarkCard('second-provider', 'bench-gamma').should('not.exist');
  });

  it('should search within metrics dropdown', () => {
    chooseBenchmarkPage.visit(NAMESPACE);
    chooseBenchmarkPage.findMetricsFilter().click();

    chooseBenchmarkPage.findMetricsSearchInput().type('Accur');

    chooseBenchmarkPage.findMetricsOption('accuracy').should('exist');
    chooseBenchmarkPage.findMetricsOption('toxicity').should('not.exist');
  });

  it('should show badge count on metrics filter toggle', () => {
    chooseBenchmarkPage.visit(NAMESPACE);
    // Metric option test IDs use the raw lowercase value from the benchmark data
    chooseBenchmarkPage.selectMetricsOption('accuracy');

    chooseBenchmarkPage.findMetricsFilterBadge().should('have.text', '1');
  });
});

describe('Choose Benchmark Page - Combined Filters', () => {
  beforeEach(() => {
    initIntercepts({ providers: [testProvider, secondProvider] });
  });

  it('should combine name and category filters', () => {
    chooseBenchmarkPage.visit(NAMESPACE);

    chooseBenchmarkPage.selectCategoryOption('Reasoning');

    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-alpha').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('second-provider', 'bench-gamma').should('exist');

    chooseBenchmarkPage.findNameFilterInput().type('Alpha');

    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-alpha').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('second-provider', 'bench-gamma').should('not.exist');
  });

  it('should clear all filters at once', () => {
    chooseBenchmarkPage.visit(NAMESPACE);

    chooseBenchmarkPage.selectCategoryOption('Safety');
    chooseBenchmarkPage.findNameFilterInput().type('nonexistent');

    chooseBenchmarkPage.findBenchmarksEmptyState().should('exist');
    chooseBenchmarkPage.findClearFiltersButton().click();

    chooseBenchmarkPage.findBenchmarksGallery().should('exist');
    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-alpha').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('test-provider', 'bench-beta').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('second-provider', 'bench-gamma').should('exist');
  });
});

describe('Choose Benchmark Page - Pagination', () => {
  it('should paginate when benchmarks exceed per-page limit', () => {
    // Default per-page is 24 (PAGE_SIZES[1]), so we need > 24 benchmarks to trigger pagination
    const manyBenchmarks = Array.from({ length: 30 }, (_, i) =>
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

    // Page 1 shows first 24 items (bench-0 through bench-23)
    chooseBenchmarkPage.findBenchmarksGallery().should('exist');
    chooseBenchmarkPage.findBenchmarkCard('bulk-provider', 'bench-0').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('bulk-provider', 'bench-23').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('bulk-provider', 'bench-24').should('not.exist');

    // Page 2 shows remaining items (bench-24 through bench-29)
    chooseBenchmarkPage.findNextPageButton().click();
    chooseBenchmarkPage.findBenchmarkCard('bulk-provider', 'bench-24').should('exist');
    chooseBenchmarkPage.findBenchmarkCard('bulk-provider', 'bench-29').should('exist');
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
