import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockEvalHubHealth } from '~/__mocks__/mockEvalHubHealth';
import { mockCollection, mockCollectionsListResponse } from '~/__mocks__/mockCollection';
import { chooseCollectionPage } from '~/__tests__/cypress/cypress/pages/chooseCollectionPage';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';
import type { Collection } from '~/app/types';

const NAMESPACE = 'test-namespace';
const API_VERSION = { apiVersion: CLIENT_API_VERSION };

type InterceptOptions = {
  collections?: Collection[];
  totalCount?: number;
};

const initIntercepts = ({ collections = [], totalCount }: InterceptOptions = {}) => {
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
    mockCollectionsListResponse(collections, totalCount),
  );
};

const safetySuite = mockCollection({
  id: 'col-safety',
  name: 'Safety Suite',
  category: 'Safety',
  description: 'Safety evaluation collection.',
  benchmarkIds: ['harmful_request_refusal', 'toxigen'],
});

const reasoningSuite = mockCollection({
  id: 'col-reasoning',
  name: 'Reasoning Suite',
  category: 'Reasoning',
  description: 'Reasoning evaluation collection.',
  benchmarkIds: ['hellaswag'],
});

const accuracySuite = mockCollection({
  id: 'col-accuracy',
  name: 'Accuracy Suite',
  category: 'Accuracy',
  description: 'Accuracy evaluation collection.',
  benchmarkIds: ['truthfulqa_mc1'],
});

describe('Choose Collection Page', () => {
  beforeEach(() => {
    initIntercepts({ collections: [safetySuite, reasoningSuite, accuracySuite] });
  });

  it('should display collection cards in the gallery', () => {
    chooseCollectionPage.visit(NAMESPACE);
    chooseCollectionPage.findTitle().should('contain.text', 'Select benchmark suite');
    chooseCollectionPage.findCollectionsGallery().should('exist');
    chooseCollectionPage.findCollectionCard('col-safety').should('exist');
    chooseCollectionPage.findCollectionCard('col-safety').should('contain.text', 'Safety Suite');
    chooseCollectionPage.findCollectionCard('col-reasoning').should('exist');
    chooseCollectionPage.findCollectionCard('col-accuracy').should('exist');
  });

  it('should filter collections by name', () => {
    chooseCollectionPage.visit(NAMESPACE);
    chooseCollectionPage.findNameFilterInput().type('Safety');

    chooseCollectionPage.findCollectionCard('col-safety').should('exist');
    chooseCollectionPage.findCollectionCard('col-reasoning').should('not.exist');
    chooseCollectionPage.findCollectionCard('col-accuracy').should('not.exist');
  });

  it('should filter collections by category', () => {
    chooseCollectionPage.visit(NAMESPACE);
    chooseCollectionPage.findCategoryToggle().click();
    chooseCollectionPage.findCategoryOption('Reasoning').click();

    chooseCollectionPage.findCollectionCard('col-reasoning').should('exist');
    chooseCollectionPage.findCollectionCard('col-safety').should('not.exist');
    chooseCollectionPage.findCollectionCard('col-accuracy').should('not.exist');
  });

  it('should show empty state when filters match nothing', () => {
    chooseCollectionPage.visit(NAMESPACE);
    chooseCollectionPage.findNameFilterInput().type('nonexistent');

    chooseCollectionPage.findCollectionsEmptyState().should('exist');
    chooseCollectionPage.findCollectionsEmptyState().should('contain.text', 'No collections match');
  });

  it('should open and close the collection drawer panel', () => {
    chooseCollectionPage.visit(NAMESPACE);

    chooseCollectionPage.findCollectionCard('col-safety').findByText('Safety Suite').click();

    chooseCollectionPage.findCollectionDrawerPanel().should('exist');
    chooseCollectionPage.findCollectionDrawerPanel().should('contain.text', 'Safety Suite');

    chooseCollectionPage
      .findCollectionDrawerPanel()
      .findByRole('button', { name: 'Close drawer panel' })
      .click();
    chooseCollectionPage.findCollectionDrawerPanel().should('not.exist');
  });

  it('should navigate to start page when clicking "Use this benchmark suite"', () => {
    chooseCollectionPage.visit(NAMESPACE);

    chooseCollectionPage.findUseBenchmarkSuiteButton('col-safety').click();

    cy.url().should('include', `${NAMESPACE}/create/start`);
    cy.url().should('include', 'type=collection');
    cy.url().should('include', 'collectionId=col-safety');
  });
});

describe('Choose Collection Page - Pagination', () => {
  it('should paginate when collections exceed the page size', () => {
    const manyCollections = Array.from({ length: 10 }, (_, i) =>
      mockCollection({
        id: `col-${i}`,
        name: `Collection ${i}`,
        category: i % 2 === 0 ? 'Safety' : 'Reasoning',
      }),
    );

    initIntercepts({ collections: manyCollections });
    chooseCollectionPage.visit(NAMESPACE);

    chooseCollectionPage.findCollectionsGallery().should('exist');
    chooseCollectionPage.findCollectionCard('col-0').should('exist');
    chooseCollectionPage.findCollectionCard('col-5').should('exist');
    chooseCollectionPage.findCollectionCard('col-6').should('not.exist');

    chooseCollectionPage.findNextPageButton().click();
    chooseCollectionPage.findCollectionCard('col-6').should('exist');
    chooseCollectionPage.findCollectionCard('col-9').should('exist');
    chooseCollectionPage.findCollectionCard('col-0').should('not.exist');
  });
});

describe('Choose Collection Page - Empty', () => {
  it('should show empty state when no collections exist', () => {
    initIntercepts({ collections: [] });
    chooseCollectionPage.visit(NAMESPACE);

    chooseCollectionPage.findCollectionsEmptyState().should('exist');
    chooseCollectionPage
      .findCollectionsEmptyState()
      .should('contain.text', 'No collections available');
  });
});
