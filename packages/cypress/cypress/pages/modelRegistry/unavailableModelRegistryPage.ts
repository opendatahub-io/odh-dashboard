class UnavailableModelRegistryPage {
  visit(registryName: string) {
    cy.visitWithLogin(`/ai-hub/models/registry/${registryName}`);
    this.wait();
  }

  private wait() {
    this.findUnavailableState().should('exist');
    cy.testA11y();
  }

  findUnavailableState() {
    return cy.findByTestId('unavailable-model-registry');
  }

  findSettingsLink() {
    return cy.findByTestId('registry-settings-link');
  }

  findWhosMyAdminLink() {
    return cy.findByTestId('whos-my-admin-link');
  }
}

export const unavailableModelRegistryPage = new UnavailableModelRegistryPage();
