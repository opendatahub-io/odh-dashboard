import { automlResultsPage } from '~/__tests__/cypress/cypress/pages/automlResults';

const RUN_ID = '9ec21d90-baa0-4a6b-bb2a-40d9d4b43c54';
const NAMESPACE = 'my-project';

// Throwaway spec: screenshot the model schema tab header for visual debugging. Not for CI.
describe('ZZ screenshot model schema', () => {
  it('screenshots the Order header', () => {
    automlResultsPage.visit(NAMESPACE, RUN_ID);
    automlResultsPage.findModelLink(1).click();
    automlResultsPage.findModelDetailsModal().should('be.visible');
    automlResultsPage.findTab('model-schema').click();
    cy.findByTestId('model-schema-row-Name').should('exist');
    cy.findByTestId('automl-model-details-modal').screenshot('model-schema-tab', {
      overwrite: true,
    });
  });
});
