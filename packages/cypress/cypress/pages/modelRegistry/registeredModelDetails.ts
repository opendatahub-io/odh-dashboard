/**
 * Page objects for Registered Model and Model Version Details pages.
 * ModelVersionDetails extends RegisteredModelDetails, scoping selectors to the version details card.
 */

class RegisteredModelDetails {
  findPropertiesExpandableSection() {
    return cy.findByTestId('properties-expandable-section').first();
  }

  findPropertiesTable() {
    return this.findPropertiesExpandableSection().findByTestId('properties-table');
  }

  findAddPropertyButton() {
    return this.findPropertiesExpandableSection().findByTestId('add-property-button');
  }

  findPropertyKeyInput() {
    return this.findPropertiesExpandableSection().findByTestId('add-property-key-input');
  }

  findPropertyValueInput() {
    return this.findPropertiesExpandableSection().findByTestId('add-property-value-input');
  }

  findSavePropertyButton() {
    return this.findPropertiesExpandableSection().findByTestId('save-edit-button-property');
  }

  findDiscardPropertyButton() {
    return this.findPropertiesExpandableSection().findByTestId('discard-edit-button-property');
  }

  // PF v6 ExpandableSection does not support data-testid on the internal toggle button;
  // querying by aria-expanded is the most stable alternative available.
  findPropertiesToggleButton() {
    return this.findPropertiesExpandableSection().find('button[aria-expanded]').first();
  }

  ensurePropertiesExpanded() {
    this.findPropertiesToggleButton()
      .scrollIntoView()
      .then(($btn) => {
        if ($btn.attr('aria-expanded') === 'false') {
          cy.wrap($btn).click();
        }
      });
    this.findPropertiesToggleButton().should('have.attr', 'aria-expanded', 'true');
    // Wait for the "Add property" button to be visible after expansion animation completes
    // This is more reliable than waiting for the table, which is conditionally rendered
    this.findAddPropertyButton().should('be.visible');
  }

  findExpandPropertiesButton() {
    return this.findPropertiesExpandableSection().findByTestId('expand-control-button');
  }

  addCustomProperty(key: string, value: string) {
    this.findAddPropertyButton().click();
    this.findPropertyKeyInput().type(key);
    this.findPropertyValueInput().type(value);
    this.findSavePropertyButton().click();
    // Wait for the input form to disappear after save
    this.findPropertyKeyInput().should('not.exist');
    // Wait for the properties table to be visible and stable before proceeding
    // This ensures the UI has finished re-rendering after the save operation
    this.findPropertiesTable().should('be.visible');
    // Wait for the Add Property button to be enabled again, indicating the section is ready
    this.findAddPropertyButton().should('be.visible').and('not.be.disabled');
  }

  shouldHaveCustomProperty(key: string, value: string) {
    // Validate the key and value are in the same row of the properties table
    // Use generous timeout for CI environments where rendering and API calls may be slower
    this.findPropertiesExpandableSection().within(() => {
      cy.findByTestId('properties-table', { timeout: 30000 }).should('be.visible');

      // Find the row containing the key, then verify value is in the same row
      // Cypress will automatically retry this entire chain until it succeeds or times out
      cy.findByTestId('properties-table')
        .find('tbody tr')
        .contains('td', key, { timeout: 30000 })
        .should('be.visible')
        .parent('tr')
        .within(() => {
          // Within the same row, verify the value exists and is visible
          cy.contains('td', value).should('be.visible');
        });
    });
    return this;
  }

  findLabel(labelText: string) {
    return cy.findByTestId('label').contains(labelText);
  }

  findLabelGroup() {
    return cy.findByTestId('popover-label-group');
  }

  findModalLabelGroup() {
    return cy.findByTestId('modal-label-group');
  }

  shouldHaveLabel(labelText: string) {
    cy.contains(labelText).should('be.visible');
    return this;
  }
}

class ModelVersionDetails extends RegisteredModelDetails {
  findVersionDetailsCard() {
    return cy.findByTestId('version-details-card');
  }

  findPropertiesExpandableSection() {
    return this.findVersionDetailsCard().findByTestId('properties-expandable-section');
  }
}

export const registeredModelDetails = new RegisteredModelDetails();
export const modelVersionDetails = new ModelVersionDetails();
