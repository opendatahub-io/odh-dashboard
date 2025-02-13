class ModelDetailsPage {
  visit() {
    cy.visitWithLogin(
      `/modelCatalog/Red%20Hat/rhelai1/granite-8b-code-instruct/1%252E3-1732870892`,
    );
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findRegisterModelButton() {
    return cy.findByTestId('register-model-button');
  }

  findLongDescription() {
    return cy.findByTestId('model-long-description');
  }

  findModelVersion() {
    return cy.findByTestId('model-version');
  }

  findModelLicense() {
    return cy.findByTestId('model-license');
  }

  findModelProvider() {
    return cy.findByTestId('model-provider');
  }

  findModelSourceImageLocation() {
    return cy.findByTestId('source-image-location');
  }
}

export const modelDetailsPage = new ModelDetailsPage();
