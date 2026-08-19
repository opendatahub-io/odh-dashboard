class FeatureStoreCreatePage {
  visit() {
    cy.visitWithLogin(
      '/develop-train/feature-store/create?devFeatureFlags=Feature+store+plugin%3Dtrue',
    );
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('have.text', 'Create feature store');
    cy.testA11y();
  }

  findWizard() {
    return cy.findByTestId('feast-create-wizard');
  }

  findNextButton() {
    return cy.findByTestId('feast-wizard-next');
  }

  findSubmitButton() {
    return cy.findByTestId('feast-wizard-submit');
  }

  findBackButton() {
    return cy.findByRole('button', { name: 'Back' });
  }

  findCancelButton() {
    return cy.findByRole('button', { name: 'Cancel' });
  }

  findStepByName(stepName: string) {
    return cy.findByRole('button', { name: stepName });
  }
}

export const featureStoreCreatePage = new FeatureStoreCreatePage();
