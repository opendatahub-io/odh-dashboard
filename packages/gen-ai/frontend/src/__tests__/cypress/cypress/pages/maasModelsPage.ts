class MaaSModelsPage {
  visit() {
    cy.visit('/maas-portal/maas/models');
    this.findPage().should('be.visible');
    cy.testA11y();
  }

  findPage() {
    return cy.findByTestId('maas-models-page');
  }

  findTitle() {
    return cy.findByTestId('app-page-title');
  }

  findModelsNavigation() {
    return cy.findByRole('link', { name: 'Model endpoints' });
  }

  findAIAssetsNavigation() {
    return cy.findByRole('link', { name: 'AI asset endpoints' });
  }

  findTable() {
    return cy.findByTestId('ai-models-table');
  }

  findModelIds() {
    return this.findTable().findAllByTestId('model-id-text');
  }

  findPlaygroundActions() {
    return this.findPage().findByTestId('try-playground-button');
  }

  findModelStatusHelp() {
    return this.findPage().findByTestId('dont-see-model-button');
  }

  findTabs() {
    return this.findPage().findByRole('tablist');
  }

  findEmptyState() {
    return cy.findByTestId('maas-models-empty');
  }

  findLoading() {
    return cy.findByTestId('maas-models-loading');
  }

  findError() {
    return cy.findByTestId('maas-models-error');
  }

  findRetry() {
    return cy.findByTestId('maas-models-retry');
  }
}

export const maasModelsPage = new MaaSModelsPage();
