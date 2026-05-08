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
    return cy.findByTestId('model-details-card-expandable-content');
  }

  findExpandedButton() {
    return cy.findByTestId('model-details-card-toggle-button');
  }

  findLabelEditButton() {
    return this.find().findByTestId('editable-labels-group-edit');
  }

  findLabelSaveButton() {
    return this.find().findByTestId('editable-labels-group-save');
  }

  findDescriptionEditButton() {
    return this.find().findByTestId('model-description-edit');
  }

  findDescriptionSaveButton() {
    return this.find().findByTestId('model-description-save');
  }

  findAlert() {
    return cy.findByTestId('edit-alert');
  }

  findPropertiesExpandableButton() {
    return this.find().findByTestId('properties-expandable-section').findByRole('button');
  }

  findAddPropertyButton() {
    return this.find().findByTestId('add-property-button');
  }

  findTable() {
    return this.find().findByTestId('properties-table');
  }

  getRow(name: string) {
    return new ExpandedModelDetailsCardPropertyRow(() =>
      this.findTable()
        .find('tr')
        .filter((_i, el) => {
          const td = el.querySelector('[data-label=Key]');
          if (!td) {
            return false;
          }
          const input = td.querySelector('input');
          const text = td.textContent || '';
          return input ? input.value === name : text.includes(name);
        })
        .first(),
    );
  }
}

class ExpandedModelDetailsCardPropertyRow {
  constructor(private findFn: () => Cypress.Chainable) {}

  find() {
    return this.findFn();
  }

  findKebabAction(name: string) {
    return this.find().findKebabAction(name);
  }

  findSaveButton() {
    return this.find().findByTestId('save-edit-button-property');
  }
}

export const modelDetailsCard = new ModelDetailsCard();
export const modelDetailsExpandedCard = new ModelDetailsExpandedCard();
