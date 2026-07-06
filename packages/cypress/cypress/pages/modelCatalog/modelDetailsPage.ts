class ModelDetailsPage {
  visit() {
    const sourceName = 'source-2';
    const modelName = 'sample%20category%201-model-1';
    cy.visitWithLogin(`/ai-hub/models/catalog/${sourceName}/${modelName}/overview`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    // TODO: Reinstate cy.testA11y() after RHOAIENG-55182 is fixed upstream and synced
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

  private findModelDetailsCard() {
    return cy.contains('h2', 'Model details').parents('.pf-v6-c-card').first();
  }

  expandModelDetailsLabelGroup() {
    this.findModelDetailsCard().find('button.pf-v6-c-label.pf-m-overflow').click();
  }

  findModelDetailsLabelByText(text: string) {
    return this.findModelDetailsCard().contains('[data-testid="model-catalog-label"]', text);
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

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findLabelByText(text: string) {
    return cy.findAllByTestId('model-catalog-label').contains(text);
  }

  findValidatedConfigurationsCard() {
    return cy.findByTestId('validated-configurations-card');
  }

  findToolCallingCard() {
    return cy.findByTestId('tool-calling-card');
  }

  findToolCallingToggle() {
    return cy.get('#tool-calling-toggle');
  }

  findValidatedDeploymentResourceLabels() {
    return cy.findAllByTestId('validated-deployment-resource-label');
  }
}

export const modelDetailsPage = new ModelDetailsPage();
