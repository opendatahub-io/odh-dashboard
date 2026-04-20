class ModelDetailsCard {
  findDescriptionEditButton() {
    return cy.findByTestId('model-description-edit');
  }

  findDescriptionTextArea() {
    return cy.findByTestId('model-description-input');
  }

  findDescriptionSaveButton() {
    return cy.findByTestId('model-description-save');
  }
}

class ModelDetailsExpandedCard {
  find() {
    return cy.findByTestId('expandable-section__content');
  }

  findExpandedButton() {
    return cy.findByTestId('model-details-expanded-toggle');
  }

  findLabelEditButton() {
    return cy.findByTestId('editable-labels-group-edit');
  }

  findLabelSaveButton() {
    return cy.findByTestId('editable-labels-group-save');
  }

  findDescriptionEditButton() {
    return this.find().findByTestId('model-description-edit');
  }

  findDescriptionSaveButton() {
    return this.find().findByTestId('model-description-save');
  }

  findAlert() {
    return cy.findByTestId('unsaved-changes-alert');
  }

  findPropertiesExpandableButton() {
    return cy.findByTestId('properties-expandable-section-toggle');
  }

  findAddPropertyButton() {
    return cy.findByTestId('add-property-button');
  }

  getRow(name: string) {
    return new PropertyRow(() => cy.findByTestId(`property-row-${name}`));
  }
}

class PropertyRow {
  constructor(private findFn: () => Cypress.Chainable) {}

  private find() {
    return this.findFn();
  }

  findKebabAction(name: string) {
    this.find().findByTestId('property-row-kebab').click();
    return cy.findByRole('menuitem', { name });
  }

  findSaveButton() {
    return this.find().findByTestId('save-property-button');
  }
}

export const modelDetailsCard = new ModelDetailsCard();
export const modelDetailsExpandedCard = new ModelDetailsExpandedCard();
