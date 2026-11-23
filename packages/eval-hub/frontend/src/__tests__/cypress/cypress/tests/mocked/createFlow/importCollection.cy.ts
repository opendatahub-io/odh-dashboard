/* eslint-disable camelcase */
import { mockModArchResponse } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockEvalHubHealth } from '~/__mocks__/mockEvalHubHealth';
import { mockCollection, mockCollectionsListResponse } from '~/__mocks__/mockCollection';
import { evaluationsPage } from '~/__tests__/cypress/cypress/pages/evaluationsPage';
import { importCollectionModal } from '~/__tests__/cypress/cypress/pages/components/ImportCollectionModal';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';
import type { Collection } from '~/app/types';

const NAMESPACE = 'test-namespace';
const API_VERSION = { apiVersion: CLIENT_API_VERSION };

const existingCollection = mockCollection({
  id: 'existing-suite',
  name: 'Existing suite',
  benchmarkIds: ['bench-alpha'],
});

const importedCollection = mockCollection({
  id: 'imported-suite',
  name: 'Imported suite',
});

const validContent = [
  'name: imported-suite',
  'description: A collection imported from file content.',
  'domains:',
  '  - knowledge_and_reasoning',
  'benchmarks:',
  '  - id: bench-alpha',
  '    provider_id: test-provider',
].join('\n');

type InterceptOptions = {
  allowed?: boolean;
  collections?: Collection[];
};

const initIntercepts = ({
  allowed = true,
  collections = [existingCollection],
}: InterceptOptions = {}) => {
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
  cy.interceptApi('GET /api/:apiVersion/evaluations/providers', { path: API_VERSION }, []);
  cy.interceptApi(
    'GET /api/:apiVersion/evaluations/collections',
    { path: API_VERSION },
    mockCollectionsListResponse(collections),
  );
  cy.interceptApi(
    'GET /api/:apiVersion/evaluations/collection-imports/access',
    { path: API_VERSION, query: { namespace: NAMESPACE } },
    { allowed },
  ).as('importAccess');
};

describe('Import collection', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should open the import dialog from the My benchmark collections page with the default template', () => {
    evaluationsPage.visitBenchmarkSuites(NAMESPACE);
    evaluationsPage.findImportCollectionButton().should('be.enabled').click();

    importCollectionModal.shouldBeOpen();
    importCollectionModal
      .getValue()
      .should('match', /# Example collection format\n\nname: my-collection/);
    importCollectionModal.findNameInput().should('have.value', 'my-collection');
    // The unchanged sample template is not importable as-is, without an alert.
    cy.findByTestId('import-collection-template').should('not.exist');
    importCollectionModal.findSubmitButton().should('be.disabled');

    importCollectionModal.setValue(validContent);
    importCollectionModal.findNameInput().should('have.value', 'imported-suite');
    importCollectionModal.findSubmitButton().should('be.enabled');
  });

  it('should open the import dialog from the create tile on the Benchmark collections tab', () => {
    evaluationsPage.visitEvaluate(NAMESPACE);
    evaluationsPage.findCreateSuiteCard().should('exist');
    evaluationsPage.findImportCollectionButton().click();

    importCollectionModal.shouldBeOpen();
  });

  it('should mark the invalid YAML line in the editor and disable submission', () => {
    evaluationsPage.visitBenchmarkSuites(NAMESPACE);
    evaluationsPage.findImportCollectionButton().click();

    importCollectionModal.setValue('name: broken\n  bad_indent: true\n');
    // The offending line carries an error marker (squiggle + margin icon).
    importCollectionModal.findErrorSquiggle().should('exist');
    importCollectionModal.findSubmitButton().should('be.disabled');
    importCollectionModal.findNameInput().should('be.disabled');

    importCollectionModal.setValue(validContent);
    importCollectionModal.findErrorSquiggle().should('not.exist');
  });

  it('should mark pre-submission warnings in the editor', () => {
    evaluationsPage.visitBenchmarkSuites(NAMESPACE);
    evaluationsPage.findImportCollectionButton().click();

    importCollectionModal.setValue(
      'name: warn-me\ncategory: safety\nmystery: 1\nbenchmarks:\n  - id: bench-alpha\n    provider_id: test-provider\n',
    );
    // Missing description plus the unrecognized field produce warning markers.
    importCollectionModal.findWarningSquiggles().should('have.length.at.least', 2);
    importCollectionModal.findSubmitButton().should('be.enabled');
  });

  it('should detect a name collision and apply the suggested name', () => {
    evaluationsPage.visitBenchmarkSuites(NAMESPACE);
    evaluationsPage.findImportCollectionButton().click();

    importCollectionModal.setValue(
      'name: existing suite\ncategory: safety\nbenchmarks:\n  - id: bench-alpha\n    provider_id: test-provider\n',
    );
    importCollectionModal.findCollisionAlert().should('contain.text', 'Existing suite');
    // Submission is blocked until the collision is resolved.
    importCollectionModal.findSubmitButton().should('be.disabled');
    importCollectionModal.findUseSuggestedNameButton().click();
    importCollectionModal.getValue().should('match', /name: '?existing suite-\d{4}-\d{2}-\d{2}'?/);
    importCollectionModal
      .findNameInput()
      .invoke('val')
      .should('match', /^existing suite-\d{4}-\d{2}-\d{2}$/);
    importCollectionModal.findSubmitButton().should('be.enabled');
  });

  it('should label the definition language from its content', () => {
    evaluationsPage.visitBenchmarkSuites(NAMESPACE);
    evaluationsPage.findImportCollectionButton().click();

    importCollectionModal.findLanguageLabel().should('have.text', 'YAML');

    importCollectionModal.setValue(
      '{"name": "json-collection", "description": "Imported as JSON."}',
    );
    importCollectionModal.findLanguageLabel().should('have.text', 'JSON');

    importCollectionModal.setValue(validContent);
    importCollectionModal.findLanguageLabel().should('have.text', 'YAML');
  });

  it('should keep the name field and the definition in sync', () => {
    evaluationsPage.visitBenchmarkSuites(NAMESPACE);
    evaluationsPage.findImportCollectionButton().click();

    importCollectionModal.setValue(validContent);
    importCollectionModal.findNameInput().should('have.value', 'imported-suite');

    importCollectionModal.findNameInput().clear().type('renamed-suite');
    // The editor mirrors the name while the field still has focus, after the
    // debounced write.
    importCollectionModal.shouldContainValue(/name: renamed-suite\n/);
    importCollectionModal.findNameInput().should('have.value', 'renamed-suite');

    importCollectionModal.findNameInput().type('{enter}');
    importCollectionModal.getValue().should('match', /name: renamed-suite\n/);
    importCollectionModal.findSubmitButton().should('be.enabled');
  });

  it('should restore the sample template from the reset link', () => {
    evaluationsPage.visitBenchmarkSuites(NAMESPACE);
    evaluationsPage.findImportCollectionButton().click();

    importCollectionModal.setValue(validContent);
    importCollectionModal.findResetButton().click();

    importCollectionModal.getValue().should('match', /name: my-collection/);
    importCollectionModal.findNameInput().should('have.value', 'my-collection');
    importCollectionModal.findSubmitButton().should('be.disabled');
  });

  it('should submit the content from the collections page and stay on the collections page', () => {
    cy.intercept(
      {
        method: 'POST',
        pathname: '/eval-hub/api/v1/evaluations/collection-imports',
      },
      {
        statusCode: 201,
        body: mockModArchResponse({
          collection: importedCollection,
          warnings: ['Field "id" is managed by the server and will be ignored.'],
        }),
      },
    ).as('importCollection');

    evaluationsPage.visitBenchmarkSuites(NAMESPACE);
    // The imported collection is not present before the import runs.
    evaluationsPage.findBenchmarkSuiteCard('imported-suite').should('not.exist');
    evaluationsPage.findImportCollectionButton().click();

    importCollectionModal.setValue(validContent);
    // Only now does the collections response include the imported collection:
    // after the POST succeeds, the invalidated collections query refetches
    // and the gallery must show the imported collection without a reload.
    cy.interceptApi(
      'GET /api/:apiVersion/evaluations/collections',
      { path: API_VERSION },
      mockCollectionsListResponse([existingCollection, importedCollection]),
    );
    importCollectionModal.findSubmitButton().click();

    cy.wait('@importCollection').then((interception) => {
      expect(interception.request.query.namespace).to.equal(NAMESPACE);
      expect(interception.request.body).to.deep.equal({ content: validContent });
    });
    importCollectionModal.shouldBeOpen(false);
    cy.findByTestId('import-collection-success').should('not.exist');
    evaluationsPage.findBenchmarkSuiteCard('imported-suite').should('exist');
    cy.location('pathname').should('eq', `/evaluation/${NAMESPACE}/collections`);
  });

  it('should navigate to the collections page from the evaluate tab on success', () => {
    cy.intercept(
      {
        method: 'POST',
        pathname: '/eval-hub/api/v1/evaluations/collection-imports',
      },
      {
        statusCode: 201,
        body: mockModArchResponse({
          collection: importedCollection,
          warnings: ['Field "id" is managed by the server and will be ignored.'],
        }),
      },
    ).as('importCollection');

    evaluationsPage.visitEvaluate(NAMESPACE);
    evaluationsPage.findImportCollectionButton().click();

    importCollectionModal.setValue(validContent);
    importCollectionModal.findSubmitButton().click();

    cy.wait('@importCollection');
    importCollectionModal.shouldBeOpen(false);
    cy.location('pathname').should('eq', `/evaluation/${NAMESPACE}/collections`);
  });

  it('should lock the form while the import request is in flight', () => {
    cy.intercept(
      {
        method: 'POST',
        pathname: '/eval-hub/api/v1/evaluations/collection-imports',
      },
      (req) => {
        req.reply({
          delay: 3000,
          statusCode: 201,
          body: mockModArchResponse({ collection: importedCollection, warnings: [] }),
        });
      },
    ).as('importCollection');

    evaluationsPage.visitBenchmarkSuites(NAMESPACE);
    evaluationsPage.findImportCollectionButton().click();

    importCollectionModal.setValue(validContent);
    importCollectionModal.findSubmitButton().click();

    importCollectionModal.findSubmitButton().should('be.disabled');
    importCollectionModal.findCancelButton().should('be.disabled');
    importCollectionModal.findNameInput().should('be.disabled');
    importCollectionModal.findResetButton().should('be.disabled');
    importCollectionModal.shouldBeReadOnly();
    importCollectionModal
      .find()
      .findByRole('button', { name: 'Upload a collection definition file' })
      .should('be.disabled');
    importCollectionModal
      .find()
      .findByRole('button', { name: 'Clear the collection definition' })
      .should('be.disabled');

    cy.wait('@importCollection');
    importCollectionModal.shouldBeOpen(false);
  });

  it('should keep the dialog open with the server error when submission fails', () => {
    cy.intercept(
      {
        method: 'POST',
        pathname: '/eval-hub/api/v1/evaluations/collection-imports',
      },
      {
        statusCode: 400,
        body: {
          error: {
            code: '400',
            message: 'a referenced provider or benchmark is not found or not accessible',
          },
        },
      },
    ).as('importCollection');

    evaluationsPage.visitBenchmarkSuites(NAMESPACE);
    evaluationsPage.findImportCollectionButton().click();

    importCollectionModal.setValue(validContent);
    importCollectionModal.findSubmitButton().click();

    cy.wait('@importCollection');
    importCollectionModal.findSubmitError().should('contain.text', 'not found or not accessible');
    importCollectionModal.shouldBeOpen();
  });

  it('should disable the import button with a tooltip when the user cannot create collections', () => {
    initIntercepts({ allowed: false });
    evaluationsPage.visitBenchmarkSuites(NAMESPACE);
    cy.wait('@importAccess');
    evaluationsPage.findImportCollectionButton().should('be.disabled');
  });
});
