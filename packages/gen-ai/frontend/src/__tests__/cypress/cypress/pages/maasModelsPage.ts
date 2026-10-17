class MaaSModelsPage {
  private navigate(grid?: boolean) {
    const query = grid === undefined ? '' : `?devFeatureFlags=grid=${grid}`;
    cy.visit(`/maas-portal/maas/models${query}`);
  }

  visit(grid?: boolean) {
    this.navigate(grid);
    this.findPage().should('be.visible');
    cy.testA11y();
  }

  visitUnavailable(grid?: boolean) {
    this.navigate(grid);
    cy.findByRole('heading', { name: 'Page not found' }).should('be.visible');
    this.findPage().should('not.exist');
    this.findModelsNavigation().should('not.exist');
    cy.testA11y();
  }

  findPage() {
    return cy.findByTestId('maas-models-page');
  }

  findTitle() {
    return cy.findByTestId('app-page-title');
  }

  findModelsNavigation() {
    return cy.findByRole('link', { name: 'Models' });
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
