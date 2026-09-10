import { fileExplorer } from '~/__tests__/cypress/cypress/pages/evaluationFileCreator';
import { vectorDbConnection } from '~/__tests__/cypress/cypress/pages/vectorDbConnection';

const NAMESPACE = 'my-project';
const MAAS_SECRET = 'maas';
const STORAGE_SECRET = 'data-connection';
const VECTOR_DB_SECRET = 'vector-db';
const DOCUMENTS_FOLDER_NAME = 'documents';
const DOCUMENT_NAME = 'all_bank_policies.pdf';

const initIntercepts = () => {
  cy.intercept({ method: 'GET', pathname: '**/api/connection-types' }, { body: { items: [] } });
};

const navigateToConfigure = () => {
  cy.visit(`/gen-ai-studio/autorag/configure/${NAMESPACE}`);
  cy.findByTestId('autorag-name-input').should('be.visible');
  cy.testA11y();
};

const advanceToConfigureDetails = () => {
  cy.findByTestId('autorag-name-input').type('Vector DB Experiment');
  cy.findByTestId('maas-secret-selector').click();
  cy.findByRole('option', { name: new RegExp(MAAS_SECRET, 'i') }).click();
  cy.findByTestId('autorag-next-button').click();
  cy.findByTestId('configure-step-subtitle').should('be.visible');

  cy.findByTestId('aws-secret-selector').should('exist');
  cy.findByTestId('aws-secret-selector').click();
  cy.findByTestId('aws-secret-selector').find('input').type(STORAGE_SECRET);
  cy.findByRole('option', { name: new RegExp(STORAGE_SECRET, 'i') })
    .should('be.visible')
    .click();

  fileExplorer.findBrowseBucketButton().click();
  fileExplorer.find().should('be.visible');
  fileExplorer.navigateIntoFolder('autorag input data');
  fileExplorer.navigateIntoFolder('pdf');
  fileExplorer.navigateIntoFolder('bank_policies_pdf');
  fileExplorer.navigateIntoFolder(DOCUMENTS_FOLDER_NAME);
  fileExplorer.findRow(DOCUMENT_NAME).click();
  fileExplorer.findSelectButton().click();

  vectorDbConnection.findFormGroup().should('be.visible');
};

describe('Vector database connection', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should show the vector database selector and existing secrets', () => {
    navigateToConfigure();
    advanceToConfigureDetails();

    vectorDbConnection.findDescription().should('contain.text', 'MILVUS_* or PGVECTOR_*');
    vectorDbConnection.findSelector().should('exist');
    vectorDbConnection.findSelector().click();
    cy.findByRole('option', { name: new RegExp(VECTOR_DB_SECRET, 'i') }).should('be.visible');
    cy.findByRole('option', { name: new RegExp(VECTOR_DB_SECRET, 'i') }).click();
    vectorDbConnection.findSelector().should('contain.text', VECTOR_DB_SECRET);
  });

  it('should show the empty secret message and split actions', () => {
    cy.intercept('GET', '**/autorag/api/v1/secrets*', (req) => {
      const type = new URL(req.url, 'http://localhost').searchParams.get('type');
      if (type === 'vector-db') {
        req.reply({ body: { data: [] } });
        return;
      }
      req.continue();
    }).as('emptyVectorDbSecrets');

    navigateToConfigure();
    advanceToConfigureDetails();
    cy.wait('@emptyVectorDbSecrets');

    vectorDbConnection.findEmptyMessage().should('be.visible');
    vectorDbConnection.findAddMilvusButton().should('be.visible');
    vectorDbConnection.findSplitButton().click();
    vectorDbConnection.findAddMilvusMenuItem().should('be.visible');
    vectorDbConnection.findAddPgvectorButton().should('be.visible');
  });

  it('should open the Milvus connection modal from the split action', () => {
    navigateToConfigure();
    advanceToConfigureDetails();

    vectorDbConnection.findAddMilvusButton().click();
    vectorDbConnection.findModal().should('be.visible');
    cy.testA11y();
    vectorDbConnection.findMilvusUri().should('be.visible');
    vectorDbConnection.findMilvusToken().should('be.visible');
    vectorDbConnection.findMilvusServerCert().should('be.visible');
    vectorDbConnection.findModalSubmit().should('be.disabled');
  });

  it('should switch the modal to the PGVector schema', () => {
    navigateToConfigure();
    advanceToConfigureDetails();

    vectorDbConnection.findSplitButton().click();
    vectorDbConnection.findAddPgvectorButton().click();
    vectorDbConnection.findModal().should('be.visible');
    vectorDbConnection.findPgvectorHost().should('be.visible');
    vectorDbConnection.findPgvectorPort().should('be.visible');
    vectorDbConnection.findPgvectorDb().should('be.visible');
    vectorDbConnection.findPgvectorUser().should('be.visible');
    vectorDbConnection.findPgvectorPassword().should('be.visible');
  });
});
