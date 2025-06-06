import { mockByon } from '~/__mocks__/mockByon';
import { asProductAdminUser } from '~/__tests__/cypress/cypress/utils/mockUsers';
import { notebookImageSettings } from '~/__tests__/cypress/cypress/pages/notebookImageSettings';

describe('Workbench Image Form Character Limits', () => {
  beforeEach(() => {
    // Set up as product admin
    asProductAdminUser();
    cy.interceptOdh('GET /api/images/byon', mockByon([]));
    notebookImageSettings.visit();
    notebookImageSettings.findImportImageButton().click();
  });

  it('should show character limit helper text and warnings', () => {
    cy.findByTestId('byon-image-name').should('be.visible');
    cy.findByTestId('byon-image-description').should('be.visible');

    // Test name field approaching limit (exactly 241 characters)
    const longImageName =
      'Data--Science-Workbench-Image-v2..0-with-Python-3.9-TensorFlow-2.8-PyTorch-1.11-Scikit-learn-1.0-Pandas-1.4-NumPy-1.22-Jupyter-Lab-3.4-CUDA-11.6-for-Machine-Learning-and-Deep-Learning-Development-Environment-Extended-Build-2024-03-Latest-End';
    cy.log(`Name length: ${longImageName.length} characters`); // Should log 241

    // Type into name field
    cy.findByTestId('byon-image-name').clear();
    cy.findByTestId('byon-image-name').type(longImageName, { delay: 0 });
    cy.findByTestId('byon-image-name').should('have.value', longImageName);
    cy.contains('Cannot exceed 250 characters (9 remaining)').should('be.visible');

    // Test description field approaching limit (exactly 5252 characters)
    const repeatingPart = 'A'.repeat(52);
    const longDescription = repeatingPart.repeat(101); // 52 * 101 = 5252 characters exactly
    cy.log(`Description length: ${longDescription.length} characters`); // Should log 5252
    // Type into description field
    cy.findByTestId('byon-image-description').clear();
    cy.findByTestId('byon-image-description').type(longDescription, { delay: 0 });
    cy.findByTestId('byon-image-description').should('have.value', longDescription);
    cy.contains('Cannot exceed 5500 characters (248 remaining)').should('be.visible');
  });
});
