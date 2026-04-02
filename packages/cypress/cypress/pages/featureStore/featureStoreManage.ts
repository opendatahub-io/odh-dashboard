class FeatureStoreManagePage {
  visit() {
    cy.visitWithLogin(
      '/develop-train/feature-store/manage?devFeatureFlags=Feature+store+plugin%3Dtrue',
    );
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
  }

  findEmptyState() {
    return cy.findByTestId('empty-feature-stores');
  }

  findCreateButtonEmpty() {
    return cy.findByTestId('create-feature-store-empty-btn');
  }

  findCreateButtonToolbar() {
    return cy.findByTestId('create-feature-store-toolbar-btn');
  }

  findTable() {
    return cy.findByTestId('feature-store-list-table');
  }

  findTableRows() {
    return this.findTable().find('tbody tr');
  }

  shouldHaveRowCount(count: number) {
    this.findTable()
      .find('tbody tr[data-ouia-component-type="PF6/TableRow"]')
      .should('have.length', count);
    return this;
  }
}

class FeatureStoreCreatePage {
  visit() {
    cy.visitWithLogin(
      '/develop-train/feature-store/create?devFeatureFlags=Feature+store+plugin%3Dtrue',
    );
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('have.text', 'Create feature store');
  }

  findProjectNameInput() {
    return cy.findByTestId('feast-project-name');
  }

  findNextButton() {
    return cy.findByTestId('feast-wizard-next');
  }

  findSubmitButton() {
    return cy.findByTestId('feast-create-submit');
  }

  findRestApiSwitch() {
    return cy.findByTestId('feast-registry-rest-api');
  }

  clickRestApiSwitch() {
    return cy.findByTestId('feast-registry-rest-api').parent('label.pf-v6-c-switch').click();
  }

  findGrpcSwitch() {
    return cy.findByTestId('feast-registry-grpc');
  }

  clickGrpcSwitch() {
    return cy.findByTestId('feast-registry-grpc').parent('label.pf-v6-c-switch').click();
  }

  findRemoteHostnameInput() {
    return cy.findByTestId('feast-remote-hostname');
  }

  findFeastRefNameInput() {
    return cy.findByTestId('feast-ref-name');
  }

  findOfflineStoreSwitch() {
    return cy.findByTestId('feast-offline-store-enabled');
  }

  clickWizardStep(stepName: string) {
    cy.findByRole('button', { name: stepName }).click();
  }
}

export const featureStoreManagePage = new FeatureStoreManagePage();
export const featureStoreCreatePage = new FeatureStoreCreatePage();
