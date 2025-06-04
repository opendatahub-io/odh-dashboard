import { getByDataTestId } from '../utils/utils';

describe('K8sNameDescriptionField', () => {
  beforeEach(() => {
    // Navigate to a page where K8sNameDescriptionField is used
    // This should be updated to the actual route where the component is used
    cy.visit('/workbenches/create');
  });

  it('should show warning when name field approaches character limit', () => {
    const testId = 'workbench-name';
    const longName = 'a'.repeat(240); // Using 250 character limit
    
    getByDataTestId(testId + '-name').type(longName);
    
    // Check if warning message appears
    cy.contains('Cannot exceed').should('be.visible');
    cy.contains('remaining').should('be.visible');
  });

  it('should show warning when description field approaches character limit', () => {
    const testId = 'workbench-name';
    const longDescription = 'a'.repeat(5250); // Using 5500 character limit
    
    getByDataTestId(testId + '-description').type(longDescription);
    
    // Check if warning message appears
    cy.contains('Cannot exceed').should('be.visible');
    cy.contains('remaining').should('be.visible');
  });
}); 