/**
 * Page object for Model Version Details page
 * Handles interactions with version properties, labels, and metadata editing
 *
 * On the version details page there are two properties-expandable-section elements:
 * one inside the collapsed parent model card and one in the version details card.
 * All selectors here use .last() to target the version's section.
 */

class ModelVersionDetails {
  findPropertiesExpandableSection() {
    return cy.findAllByTestId('properties-expandable-section').last();
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

  findPropertiesToggleButton() {
    return this.findPropertiesExpandableSection().find('button[aria-expanded]').first();
  }

  findExpandPropertiesButton() {
    return this.findPropertiesExpandableSection().findByTestId('expand-control-button');
  }

  // Helper to add a custom property
  addCustomProperty(key: string, value: string) {
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

export const modelVersionDetails = new ModelVersionDetails();
