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
    automlConfigurePage.findCompatibilityDetailsButton().should('not.exist');

    automlConfigurePage.findSeparateDatasetsRadio().click();
    automlConfigurePage.findTrainingAccordion().should('exist');
    automlConfigurePage.findTestAccordion().should('exist');
    automlConfigurePage.findCompatibilityDetailsButton().should('not.exist');
    automlConfigurePage.findDatasetSelectionCount().should('have.text', '0 of 2 datasets selected');
    automlConfigurePage.findTrainingAccordion().should('contain.text', 'Incomplete');
    automlConfigurePage.findTestAccordion().should('contain.text', 'Incomplete');
    automlConfigurePage.findCreateRunButton().should('be.disabled');

    automlConfigurePage.findTrainingAccordion().click();
    automlConfigurePage.selectStorageSecret('data-connection', 'training-data-aws-secret-selector');
    automlConfigurePage.findTrainingDataSourceToggle().should('exist');
  });
});
