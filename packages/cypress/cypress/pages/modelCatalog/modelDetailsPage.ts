class ModelDetailsPage {
  visit() {
    const sourceName = 'source-2';
    const modelName = 'sample%20category%201-model-1';
    cy.visitWithLogin(`/ai-hub/catalog/${sourceName}/${modelName}/overview`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findRegisterModelButton() {
    return cy.findByTestId('register-model-button');
  }

  findDeployModelButton() {
    return cy.findByTestId('deploy-button');
  }

  findTuneModelButton() {
    return cy.findByTestId('tune-model-button');
  }

  findTuneModelPopover() {
    return cy.findByTestId('tune-model-popover');
  }

  findLongDescription() {
    return cy.findByTestId('model-long-description');
  }

  findModelVersion() {
    return cy.findByTestId('model-version');
  }

  findModelLicenseLink() {
    return cy.findByTestId('model-license').findByTestId('model-license-link');
  }

  findModelProvider() {
    return cy.findByTestId('model-provider');
  }

  findModelSourceImageLocation() {
    return cy.findByTestId('source-image-location');
  }

  getModelSourceImageLocation() {
    return cy.get('@modelSourceImageLocation');
  }

  findModelCardMarkdown() {
    return cy.findByTestId('model-card-markdown');
  }

  findModelCatalogEmptyState() {
    return cy.findByTestId('empty-model-catalog-state');
  }

  findRegisterCatalogModelPopover() {
    return cy.findByTestId('register-catalog-model-popover');
  }

  expandLabelGroup() {
    cy.findByTestId('model-catalog-label-group').find('button').click();
  }

  findLabelByIndex(index: number) {
    return cy.findAllByTestId('model-catalog-label').eq(index);
  }

  findPerformanceInsightsTab() {
    return cy.findByTestId('performance-insights-tab');
  }

  findOverviewTab() {
    return cy.findByTestId('model-overview-tab');
  }

  clickPerformanceInsightsTab() {
    this.findPerformanceInsightsTab().click();
    return this;
  }

  findHardwareConfigurationTable() {
    return cy.findByTestId('hardware-configuration-table');
  }

  findHardwareConfigurationTableRows() {
    return cy.get('[data-testid="hardware-configuration-table"] tbody tr');
  }

  findWorkloadTypeFilter() {
    return cy.findByTestId('workload-type-filter');
  }
}

export const modelDetailsPage = new ModelDetailsPage();
