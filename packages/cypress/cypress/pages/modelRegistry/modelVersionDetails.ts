class ModelVersionDetails {
  findEditLabelsButton() {
    return cy.findByTestId('editable-labels-group-edit');
  }

  findAddLabelButton() {
    return cy.findByTestId('add-label-button');
  }

  findSaveLabelsButton() {
    return cy.findByTestId('editable-labels-group-save');
  }
}

export const modelVersionDetails = new ModelVersionDetails();
