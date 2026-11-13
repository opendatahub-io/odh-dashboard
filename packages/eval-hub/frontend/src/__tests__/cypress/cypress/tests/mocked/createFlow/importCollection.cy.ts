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
    importCollectionModal.getValue().should('match', /name: my-collection/);
  });

  it('should open the import dialog from the create tile on the Benchmark collections tab', () => {
    evaluationsPage.visitEvaluate(NAMESPACE);
    evaluationsPage.findCreateSuiteCard().should('exist');
    evaluationsPage.findImportCollectionButton().click();

    importCollectionModal.shouldBeOpen();
  });

  it('should show a parse error with the line number and disable submission for invalid YAML', () => {
    evaluationsPage.visitBenchmarkSuites(NAMESPACE);
    evaluationsPage.findImportCollectionButton().click();

    importCollectionModal.setValue('name: broken\n  bad_indent: true\n');
    importCollectionModal.findParseError().should('contain.text', 'line 2');
    // The offending line is highlighted in the editor.
    importCollectionModal.findErrorLine().should('exist');
    importCollectionModal.findSubmitButton().should('be.disabled');

    importCollectionModal.setValue(validContent);
    importCollectionModal.findErrorLine().should('not.exist');
  });

  it('should show pre-submission warnings for a definition missing a description', () => {
    evaluationsPage.visitBenchmarkSuites(NAMESPACE);
    evaluationsPage.findImportCollectionButton().click();

    importCollectionModal.setValue(
      'name: warn-me\ncategory: safety\nmystery: 1\nbenchmarks:\n  - id: bench-alpha\n    provider_id: test-provider\n',
    );
    importCollectionModal.findWarnings().should('contain.text', 'No description provided');
    importCollectionModal.findWarnings().should('contain.text', 'Unrecognized field "mystery"');
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
    importCollectionModal.getValue().should('match', /name: existing suite-\d{4}-\d{2}-\d{2}/);
    importCollectionModal.findSubmitButton().should('be.enabled');
  });

  it('should submit the content, report success, and show the imported collection', () => {
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
    evaluationsPage.findImportCollectionButton().click();

    importCollectionModal.setValue(validContent);
    importCollectionModal.findSubmitButton().click();

    cy.wait('@importCollection').then((interception) => {
      expect(interception.request.body).to.deep.equal({ content: validContent });
    });
    importCollectionModal.findSuccessAlert().should('contain.text', 'Imported suite');
    importCollectionModal.findSuccessAlert().should('contain.text', 'managed by the server');
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
