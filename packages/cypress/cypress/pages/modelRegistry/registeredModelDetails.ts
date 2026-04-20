/**
 * Page object for Registered Model Details page
 * Handles interactions with model properties, labels, and metadata editing
 */

class RegisteredModelDetails {
  // Properties section
  findPropertiesExpandableSection() {
    return cy.findByTestId('properties-expandable-section').first();
  }

  findPropertiesTable() {
    return cy.findByTestId('properties-table');
  }

  findAddPropertyButton() {
    return cy.findByTestId('add-property-button');
  }

  findPropertyKeyInput() {
    return cy.findByTestId('add-property-key-input');
  }

  findPropertyValueInput() {
    return cy.findByTestId('add-property-value-input');
  }

  findSavePropertyButton() {
    return cy.findByTestId('save-edit-button-property');
  }

  findDiscardPropertyButton() {
    return cy.findByTestId('discard-edit-button-property');
  }

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
    this.findPropertiesExpandableSection()
      .find('.pf-v6-c-expandable-section__content')
      .first()
      .should('not.have.css', 'visibility', 'hidden');
  }

  findExpandPropertiesButton() {
    return cy.findByTestId('expand-control-button');
  }

  // Helper to add a custom property
  addCustomProperty(key: string, value: string) {
    this.findPropertiesExpandableSection().click();
    this.findAddPropertyButton().click();
    this.findPropertyKeyInput().type(key);
    this.findPropertyValueInput().type(value);
    this.findSavePropertyButton().click();
  }

  // Helper to verify custom property exists
  shouldHaveCustomProperty(key: string, value: string) {
    this.findPropertiesExpandableSection().within(() => {
      cy.contains(key).should('be.visible');
      cy.contains(value).should('be.visible');
    });
    return this;
  }

  // Labels section
  findLabel(labelText: string) {
    return cy.findByTestId('label').contains(labelText);
  }

  findLabelGroup() {
    return cy.findByTestId('popover-label-group');
  }

  findModalLabelGroup() {
    return cy.findByTestId('modal-label-group');
  }

  // Helper to verify label exists
  shouldHaveLabel(labelText: string) {
    cy.contains(labelText).should('be.visible');
    return this;
  }
}

export const registeredModelDetails = new RegisteredModelDetails();
