import { automlConfigurePage } from '~/__tests__/cypress/cypress/pages/automlConfigure';

const NAMESPACE = 'my-project';

describe('AutoML configure page dataset split', () => {
  it('should show separate-dataset accordions before selecting a connection', () => {
    automlConfigurePage.visit(NAMESPACE);
    automlConfigurePage.findNameInput().type('test-dataset-run');
    automlConfigurePage.findNextButton().click();

    automlConfigurePage.findDocumentsHeading().should('exist');

    automlConfigurePage.findAutoSplitRadio().should('be.checked');
    automlConfigurePage.findTrainingAccordion().should('not.exist');
    automlConfigurePage.findTestAccordion().should('not.exist');
    cy.findByRole('button', { name: 'View details' }).should('not.exist');

    automlConfigurePage.findSeparateDatasetsRadio().click();
    automlConfigurePage.findTrainingAccordion().should('exist');
    automlConfigurePage.findTestAccordion().should('exist');
    cy.findByRole('button', { name: 'View details' }).should('not.exist');
    cy.findByText('0 of 2 datasets selected').should('exist');
    automlConfigurePage.findIncompleteSteps().should('have.length', 2);
    automlConfigurePage.findCreateRunButton().should('be.disabled');

    automlConfigurePage.findTrainingAccordion().click();
    automlConfigurePage.selectStorageSecret('data-connection', 'training-data-aws-secret-selector');
    cy.findByTestId('training-data-source-select-toggle').should('exist');
  });
});
