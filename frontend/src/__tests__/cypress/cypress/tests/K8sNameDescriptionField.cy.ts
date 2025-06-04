import { getByDataTestId } from '../utils/utils';

describe('K8sNameDescriptionField', () => {
  beforeEach(() => {
    // Navigate to a page where K8sNameDescriptionField is used
    // This should be updated to the actual route where the component is used
    cy.visit('/workbenches/create');
  });

  it('should show warning when name field approaches character limit', () => {
    const testId = 'workbench-name';
    const longName = 'a'.repeat(50); // Assuming maxLength is 60
    
    getByDataTestId(testId + '-name').type(longName);
    
    // Check if warning message appears
    cy.contains('Cannot exceed').should('be.visible');
    cy.contains('remaining').should('be.visible');
  });

  it('should show warning when description field approaches character limit', () => {
    const testId = 'workbench-name';
    const longDescription = 'a'.repeat(1750); // Assuming maxLengthDesc is 2000
    
    getByDataTestId(testId + '-description').type(longDescription);
    
    // Check if warning message appears
    cy.contains('Cannot exceed').should('be.visible');
    cy.contains('remaining').should('be.visible');
  });
}); 