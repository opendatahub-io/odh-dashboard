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
  }

  shouldHaveCustomProperty(key: string, value: string) {
    this.ensurePropertiesExpanded();
    // Avoid .within() — the table can remount after save/navigation causing a stale
    // DOM reference. Chaining from the expandable section lets Cypress retry against
    // the live DOM until the property text appears.
    this.findPropertiesExpandableSection()
      .contains('td', key, { timeout: 15000 })
      .should('be.visible');
    this.findPropertiesExpandableSection()
      .contains('td', value, { timeout: 15000 })
      .should('be.visible');
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
