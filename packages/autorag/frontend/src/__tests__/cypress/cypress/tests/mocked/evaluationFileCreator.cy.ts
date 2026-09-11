import {
  evaluationFileCreator,
  evaluationFileSelector,
  fileExplorer,
} from '~/__tests__/cypress/cypress/pages/evaluationFileCreator';

// my-project is the only fake namespace with a DSPA and secrets
// (packages/autorag/bff/internal/fake/k8s.go)
const NAMESPACE = 'my-project';
// Real fake secrets: an "ogx" secret and a "data-connection" storage secret with a bucket set
const OGX_SECRET = 'ogx';
const STORAGE_SECRET = 'data-connection';

// Real seed data under the fake S3 bucket (packages/autorag/bff/internal/fake/s3-bucket/):
// autorag input data/pdf/bank_policies_pdf/documents/ contains two PDFs.
const DOCUMENTS_FOLDER_NAME = 'documents';
const DOCUMENT_NAMES = ['all_bank_policies.pdf', 'all_bank_policies_2.pdf'];

const initIntercepts = () => {
  // Connection types come from the host dashboard API, not the autorag BFF —
  // no real backend for this in standalone mode, so it stays mocked.
  cy.intercept({ method: 'GET', pathname: '**/api/connection-types' }, { body: { items: [] } });
};

const navigateToConfigure = () => {
  cy.visit(`/gen-ai-studio/autorag/configure/${NAMESPACE}`);
  cy.findByTestId('autorag-name-input').should('be.visible');
  cy.testA11y();
};

const selectOgxAndStorageSecrets = () => {
  cy.findByTestId('autorag-name-input').type('Test Experiment');
  cy.findByTestId('ogx-secret-selector').click();
  cy.findByRole('option', { name: new RegExp(OGX_SECRET, 'i') }).click();
  cy.findByTestId('autorag-next-button').click();
  cy.findByTestId('configure-step-subtitle').should('be.visible');

  // Select S3 connection — wait for secrets to load
  cy.findByTestId('aws-secret-selector').should('exist');
  cy.findByTestId('aws-secret-selector').click();
  cy.findByTestId('aws-secret-selector').find('input').type(STORAGE_SECRET);
  cy.findByRole('option', { name: new RegExp(STORAGE_SECRET, 'i') })
    .should('be.visible')
    .click();
};

const browseToSeedFolder = () => {
  fileExplorer.findBrowseBucketButton().click();
  fileExplorer.find().should('be.visible');
  fileExplorer.navigateIntoFolder('autorag input data');
  fileExplorer.navigateIntoFolder('pdf');
  fileExplorer.navigateIntoFolder('bank_policies_pdf');
};

const advanceToStep2 = () => {
  selectOgxAndStorageSecrets();
  browseToSeedFolder();
  fileExplorer.navigateIntoFolder(DOCUMENTS_FOLDER_NAME);

  // Select input data file so the configure details panel renders
  fileExplorer.findRow(DOCUMENT_NAMES[0]).click();
  fileExplorer.findSelectButton().click();

  // Wait for the evaluation section to render
  cy.findByTestId('evaluation-create-button').should('exist');
};

const advanceToStep2WithFolder = () => {
  selectOgxAndStorageSecrets();
  browseToSeedFolder();

  // Select a folder as input data (not a file)
  fileExplorer.findRow(DOCUMENTS_FOLDER_NAME).click();
  fileExplorer.findSelectButton().click();

  cy.findByTestId('evaluation-create-button').should('exist');
};

// Helper: add a Q&A pair (document auto-selected from file input)
const addQAPair = (question: string, answer: string) => {
  evaluationFileCreator.findQuestionInput().type(question);
  evaluationFileCreator.findAnswerInput().type(answer);
  evaluationFileCreator.findAddButton().should('be.enabled');
  evaluationFileCreator.findAddButton().click();
};

describe('EvaluationFileCreator', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should open the modal, add a Q&A pair, and verify form state', () => {
    navigateToConfigure();
    advanceToStep2();

    evaluationFileCreator.find().should('not.exist');
    evaluationFileSelector.findCreateButton().click();

    evaluationFileCreator.find().should('be.visible');
    evaluationFileCreator.findEmptyState().should('be.visible');
    evaluationFileCreator.findAddButton().should('be.disabled');
    evaluationFileCreator.findSubmitButton().should('be.disabled');

    // Fill in question and answer (document auto-selected from input data file)
    evaluationFileCreator.findQuestionInput().type('What is machine learning?');
    evaluationFileCreator.findAnswerInput().type('A subset of artificial intelligence');
    evaluationFileCreator.findAddButton().should('be.enabled');
    evaluationFileCreator.findAddButton().click();

    // Row should appear in table, form should be cleared
    evaluationFileCreator.findTableRow('What is machine learning?').should('be.visible');
    evaluationFileCreator.findQuestionInput().should('have.value', '');
    evaluationFileCreator.findAnswerInput().should('have.value', '');

    evaluationFileCreator.findSubmitButton().should('be.enabled');
  });

  it('should edit and delete rows', () => {
    navigateToConfigure();
    advanceToStep2();

    evaluationFileSelector.findCreateButton().click();
    addQAPair('Q1', 'A1');
    evaluationFileCreator.findTableRow('Q1').should('be.visible');

    // Edit the row
    evaluationFileCreator.findKebabAction('Q1', 'Edit').click();
    evaluationFileCreator.findQuestionInput().should('have.value', 'Q1');
    evaluationFileCreator.findAnswerInput().should('have.value', 'A1');

    // Re-add the edited row
    evaluationFileCreator.findAddButton().click();
    evaluationFileCreator.findTableRow('Q1').should('be.visible');

    // Delete the row
    evaluationFileCreator.findKebabAction('Q1', 'Delete').click();
    evaluationFileCreator.findEmptyState().should('be.visible');
  });

  it('should submit the evaluation file and close the modal', () => {
    cy.intercept('POST', '**/autorag/api/v1/s3/files/**').as('uploadFile');

    navigateToConfigure();
    advanceToStep2();

    evaluationFileSelector.findCreateButton().click();
    addQAPair('What is AI?', 'Artificial Intelligence');

    evaluationFileCreator.findSubmitButton().click();
    cy.wait('@uploadFile');

    evaluationFileCreator.find().should('not.exist');
  });

  it('should show the uploaded file in the evaluation selector and find it via S3 browse', () => {
    cy.intercept('POST', '**/autorag/api/v1/s3/files/**').as('uploadFile');

    navigateToConfigure();
    advanceToStep2();

    evaluationFileSelector.findCreateButton().click();
    addQAPair('What is AI?', 'Artificial Intelligence');
    evaluationFileCreator.findSubmitButton().click();

    cy.wait('@uploadFile').then((interception) => {
      expect(interception.response?.statusCode, 'upload status').to.be.oneOf([200, 201]);
      const uploadedKeyValue: unknown = interception.response?.body?.key;
      expect(uploadedKeyValue, 'uploaded key')
        .to.be.a('string')
        .and.to.match(/\.json$/);
      const uploadedKey = uploadedKeyValue as string;

      evaluationFileCreator.find().should('not.exist');
      evaluationFileSelector.findFileInput().should('have.value', uploadedKey);

      // Clear the selection
      evaluationFileSelector.findClearButton().click();
      evaluationFileSelector.findFileInput().should('have.value', '');

      // Browse S3 and search for the real uploaded file (uploaded to the bucket root)
      evaluationFileSelector.findS3BrowseButton().click();
      fileExplorer.findSearch().type(uploadedKey.replace(/\.json$/, ''));
      fileExplorer.findRow(uploadedKey).should('be.visible');
    });
  });

  it('should require manual document selection when input data is a folder', () => {
    navigateToConfigure();
    advanceToStep2WithFolder();

    evaluationFileSelector.findCreateButton().click();

    // With folder input, Select button should be visible
    evaluationFileCreator.findSelectDocumentsButton().should('be.visible');

    // Fill question and answer — Add should be disabled without documents
    evaluationFileCreator.findQuestionInput().type('Q1');
    evaluationFileCreator.findAnswerInput().type('A1');
    evaluationFileCreator.findAddButton().should('be.disabled');

    // Select multiple documents from the real "documents" folder listing
    evaluationFileCreator.findSelectDocumentsButton().click();

    // Wait for the document selector's file explorer to load
    fileExplorer.findLast().should('be.visible');
    fileExplorer.findLast().contains('td', DOCUMENT_NAMES[0]).should('be.visible');

    // Select both documents via their row checkboxes
    DOCUMENT_NAMES.forEach((name) => {
      fileExplorer.findLastRowCheckbox(name).click();
    });
    fileExplorer.findLastSelectButton().click();

    // Add button should now be enabled
    evaluationFileCreator.findAddButton().should('be.enabled');
    evaluationFileCreator.findAddButton().click();

    // Row should show "2 selected" for documents
    evaluationFileCreator.findEntriesTable().contains('2 selected').should('be.visible');
  });

  it('should disable submit when the form has unsaved changes', () => {
    navigateToConfigure();
    advanceToStep2();

    evaluationFileSelector.findCreateButton().click();
    addQAPair('Q1', 'A1');

    evaluationFileCreator.findSubmitButton().should('be.enabled');

    // Type something in the question field (dirty form)
    evaluationFileCreator.findQuestionInput().type('partial');
    evaluationFileCreator.findSubmitButton().should('be.disabled');
  });

  it('should close the modal without submitting on Cancel', () => {
    navigateToConfigure();
    advanceToStep2();

    evaluationFileSelector.findCreateButton().click();
    evaluationFileCreator.find().should('be.visible');

    evaluationFileCreator.findCancelButton().click();
    evaluationFileCreator.find().should('not.exist');
  });
});
