import { explorePage } from '#~/__tests__/cypress/cypress/pages/explore';
import { mockComponents } from '#~/__mocks__/mockComponents';
import { jupyterCard } from '#~/__tests__/cypress/cypress/pages/components/JupyterCard';
import { warningValidationCard } from '#~/__tests__/cypress/cypress/pages/components/WarningValidationCard';
import { asProductAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';

describe('Explore Page', () => {
  beforeEach(() => {
    cy.interceptOdh('GET /api/components', null, mockComponents());
    explorePage.visit();
  });

  it('check start basic workbench card details', () => {
    jupyterCard.findBrandImage().should('be.visible');
    jupyterCard.findCardTitle().should('have.text', 'Start basic workbench');
    jupyterCard
      .findCardBody()
      .should(
        'have.text',
        'A multi-user version of the notebook designed for companies, classrooms and research labs.',
      );
  });

  it('should have selectable cards', () => {
    jupyterCard.findExploreCard('jupyter').click();
    jupyterCard.findDrawerPanel().should('be.visible');
  });

  it('card title should be visible', () => {
    jupyterCard.findExploreCard('rhoai').should('not.exist');
  });

  it('should validate warning message for test keys', () => {
    asProductAdminUser();
    explorePage.visit();

    // First, verify the warning validation test card is visible
    warningValidationCard.findExploreCard('warning-validation-test').should('be.visible');

    // Click the warning validation test card to open the drawer
    warningValidationCard.findExploreCard('warning-validation-test').click();

    // Wait for the drawer to be visible
    warningValidationCard.findDrawerPanel().should('be.visible');

    // Debug: Check if enable button exists (might be disabled)
    cy.get('[data-testid="enable-app"]').should('exist');

    // Find and click the enable button
    warningValidationCard.findEnableButton().click();

    // Test that a matching key triggers the warning
    cy.step('Input test key that matches warning regex');
    warningValidationCard.findKeyInput().clear().type('test-warning-123');

    // Verify warning message appears
    cy.step('Verify warning message appears for test key');
    warningValidationCard.findWarningAlert().should('be.visible');
    warningValidationCard
      .findWarningAlert()
      .should('contain', 'This key starts with test-warning-');

    // Test that a non-matching key does NOT trigger the warning
    cy.step('Input key that does not match warning regex');
    warningValidationCard.findKeyInput().clear().type('production-key-456');

    // Verify warning message disappears
    cy.step('Verify warning message disappears for production key');
    warningValidationCard.findWarningAlert().should('not.exist');
  });
});
