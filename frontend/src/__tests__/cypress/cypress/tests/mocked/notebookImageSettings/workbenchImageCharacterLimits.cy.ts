describe('Workbench Image Form Character Limits', () => {
  beforeEach(() => {
    cy.visitWithLogin('/workbenchImages');
    cy.findByTestId('import-new-image').click();
  });

  it('should show character limit helper text and warnings', () => {
    // Initially should show base helper text
    cy.contains('Cannot exceed 250 characters').should('be.visible');
    cy.contains('Cannot exceed 5500 characters').should('be.visible');

    // Test name field approaching limit (240 characters - 10 remaining)
    const approachingNameLimit = 'a'.repeat(240);
    cy.findByTestId('byon-image-name').type(approachingNameLimit);
    cy.contains('Cannot exceed 250 characters (10 remaining)').should('be.visible');

    // Test description field approaching limit (5250 characters - 250 remaining)
    const approachingDescLimit = 'a'.repeat(5250);
    cy.findByTestId('byon-image-description').type(approachingDescLimit);
    cy.contains('Cannot exceed 5500 characters (250 remaining)').should('be.visible');
  });
});
