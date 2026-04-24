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
  }

  findExpandPropertiesButton() {
    return this.findPropertiesExpandableSection().findByTestId('expand-control-button');
  }

  addCustomProperty(key: string, value: string) {
    this.findAddPropertyButton().click();
    this.findPropertyKeyInput().type(key);
    this.findPropertyValueInput().type(value);
    this.findSavePropertyButton().click();
  }

  shouldHaveCustomProperty(key: string, value: string) {
    this.findPropertiesExpandableSection().within(() => {
      cy.contains(key).should('be.visible');
      cy.contains(value).should('be.visible');
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
