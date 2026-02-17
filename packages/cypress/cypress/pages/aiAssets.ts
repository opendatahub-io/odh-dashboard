class AIAssetsPage {
  navigate(namespace: string) {
    cy.visit(`/gen-ai-studio/assets/${namespace}`);
    this.waitForPageLoad();
  }

  private waitForPageLoad() {
    cy.findByRole('heading', { name: 'AI asset endpoints', timeout: 15000 }).should('be.visible');
    cy.findByRole('tab', { timeout: 10000 }).should('exist');
  }

  waitForTabLoad() {
    cy.findByRole('tabpanel', { timeout: 10000 }).should('be.visible');
  }

  // Tab Navigation
  findModelsTab() {
    return cy.findByTestId('ai-assets-tab-models');
  }

  findMCPServersTab() {
    return cy.findByTestId('ai-assets-tab-mcpservers');
  }

  findMaaSTab() {
    return cy.findByTestId('ai-assets-tab-maasmodels');
  }

  switchToModelsTab() {
    this.findModelsTab().click();
    this.waitForTabLoad();
  }

  switchToMCPServersTab() {
    this.findMCPServersTab().click();
    this.waitForTabLoad();
  }

  switchToMaaSTab() {
    this.findMaaSTab().click();
    this.waitForTabLoad();
  }

  // Models Tab - Table
  findModelsTable() {
    return cy.findByTestId('ai-models-table');
  }

  findModelsTableToolbar() {
    return cy.findByTestId('models-table-toolbar');
  }

  findModelsTableRow(modelName: string) {
    // Scope to name column to avoid partial matches with model names that are substrings of others
    // Use a safe text-based lookup instead of injecting modelName into a selector
    return this.findModelsTable()
      .find('tr')
      .filter((_, row) => {
        const nameCell = Cypress.$(row).find('[data-label="Model deployment name"]');
        return nameCell.text().trim() === modelName;
      });
  }

  // Models Tab - Empty State
  findEmptyState() {
    return cy.findByTestId('empty-state');
  }

  findEmptyStateMessage() {
    return cy.findByTestId('empty-state-message');
  }

  findEmptyStateActionButton() {
    return cy.findByTestId('empty-state-action-button');
  }

  // Models Tab - Loading State
  findLoadingSpinner() {
    return cy.findByRole('progressbar');
  }

  // Models Tab - Filters
  findFilterToggle() {
    return this.findModelsTableToolbar().findByRole('button', { name: /Filter toggle/i });
  }

  findSearchInput() {
    return this.findModelsTableToolbar().findByRole('searchbox');
  }

  findClearAllFiltersButton() {
    return this.findModelsTableToolbar().findByRole('button', { name: /Clear all filters/i });
  }

  selectFilterType(filterType: string) {
    this.findFilterToggle().click();
    cy.findByRole('menuitem', { name: filterType }).click();
  }

  filterByName(name: string) {
    this.selectFilterType('Name');
    this.findSearchInput().clear().type(`${name}{enter}`);
  }

  filterByKeyword(keyword: string) {
    this.selectFilterType('Keyword');
    this.findSearchInput().clear().type(`${keyword}{enter}`);
  }

  filterByUseCase(useCase: string) {
    this.selectFilterType('Use case');
    this.findSearchInput().clear().type(`${useCase}{enter}`);
  }

  clearAllFilters() {
    this.findClearAllFiltersButton().click();
  }

  findActiveFilterChip(filterType: string, value: string) {
    // Use a stable selector instead of PatternFly-specific classes
    return this.findModelsTableToolbar().findByRole('listitem').contains(`${filterType}: ${value}`);
  }

  removeFilterChip(filterType: string, value: string) {
    this.findActiveFilterChip(filterType, value)
      .findByRole('button', { name: new RegExp(`Remove ${filterType} filter`, 'i') })
      .click();
  }

  // Models Tab - Model Information Popover
  findDontSeeModelButton() {
    return cy.findByTestId('dont-see-model-button');
  }

  openModelInfoPopover() {
    this.findDontSeeModelButton().click();
  }

  findModelInfoPopoverContent() {
    return cy.findByRole('dialog', {
      name: /Information about making model deployments available/i,
    });
  }

  closeModelInfoPopover() {
    this.findModelInfoPopoverContent().findByRole('button', { name: /close/i }).click();
  }

  // Models Tab - Model Table Row Actions
  findTryInPlaygroundButton(modelName: string) {
    return this.findModelsTableRow(modelName).findByTestId('try-playground-button');
  }

  findAddToPlaygroundButton(modelName: string) {
    return this.findModelsTableRow(modelName).findByRole('button', { name: /Add to playground/i });
  }

  tryModelInPlayground(modelName: string) {
    this.findTryInPlaygroundButton(modelName).click();
  }

  addModelToPlayground(modelName: string) {
    this.findAddToPlaygroundButton(modelName).click();
  }

  // Models Tab - Endpoint Actions
  findViewUrlButton(modelName: string) {
    return this.findModelsTableRow(modelName).findByTestId('view-url-button');
  }

  findCopyEndpointButton(modelName: string) {
    return this.findModelsTableRow(modelName).findByTestId('copy-endpoint-button');
  }

  findCopyTokenButton(modelName: string) {
    return this.findModelsTableRow(modelName).findByTestId('copy-token-button');
  }

  viewEndpointUrl(modelName: string) {
    this.findViewUrlButton(modelName).click();
  }

  copyEndpoint(modelName: string) {
    this.findCopyEndpointButton(modelName).click();
  }

  copyToken(modelName: string) {
    this.findCopyTokenButton(modelName).click();
  }

  // Models Tab - Model Status
  findModelStatus(modelName: string) {
    return this.findModelsTableRow(modelName).find('[data-label="Status"]');
  }

  verifyModelStatus(modelName: string, status: 'Active' | 'Inactive') {
    this.findModelStatus(modelName).should('contain', status);
  }

  // Models Tab - Model Columns
  findModelName(modelName: string) {
    return this.findModelsTableRow(modelName).find('[data-label="Model deployment name"]');
  }

  findModelInternalEndpoint(modelName: string) {
    return this.findModelsTableRow(modelName).find('[data-label="Internal endpoint"]');
  }

  findModelExternalEndpoint(modelName: string) {
    return this.findModelsTableRow(modelName).find('[data-label="External endpoint"]');
  }

  findModelUseCase(modelName: string) {
    return this.findModelsTableRow(modelName).find('[data-label="Use case"]');
  }

  findModelPlaygroundActions(modelName: string) {
    return this.findModelsTableRow(modelName).find('[data-label="Playground"]');
  }

  // Pagination
  findPaginationControls() {
    return this.findModelsTable()
      .parent()
      .findByRole('navigation', { name: /pagination/i });
  }

  findNextPageButton() {
    return this.findPaginationControls().findByRole('button', { name: /next/i });
  }

  findPreviousPageButton() {
    return this.findPaginationControls().findByRole('button', { name: /previous/i });
  }

  goToNextPage() {
    this.findNextPageButton().click();
  }

  goToPreviousPage() {
    this.findPreviousPageButton().click();
  }

  // Table Row Count
  getVisibleRowCount() {
    return this.findModelsTable().find('tbody tr').its('length');
  }

  // Verify specific model exists in table
  verifyModelExists(modelName: string) {
    this.findModelsTableRow(modelName).should('exist');
  }

  verifyModelDoesNotExist(modelName: string) {
    this.findModelsTableRow(modelName).should('not.exist');
  }
}

export const aiAssetsPage = new AIAssetsPage();
