class AIAssetsPage {
  navigate(namespace: string) {
    cy.visit(`/gen-ai-studio/assets/${namespace}`);
    this.waitForPageLoad();
  }

  private waitForPageLoad() {
    cy.findByTestId('page-title').should('be.visible');
    cy.findByRole('tab').should('exist');
  }

  waitForTabLoad() {
    cy.findByRole('tabpanel').should('be.visible');
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
    return this.findModelsTable().contains('tr', modelName);
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
    this.findSearchInput().clear().type(name);
    this.findSearchInput().type('{enter}');
  }

  filterByKeyword(keyword: string) {
    this.selectFilterType('Keyword');
    this.findSearchInput().clear().type(keyword);
    this.findSearchInput().type('{enter}');
  }

  filterByUseCase(useCase: string) {
    this.selectFilterType('Use case');
    this.findSearchInput().clear().type(useCase);
    this.findSearchInput().type('{enter}');
  }

  clearAllFilters() {
    this.findClearAllFiltersButton().click();
  }

  findActiveFilterChip(filterType: string) {
    // Map display names to filter keys used in testIDs
    const filterKeyMap: Record<string, string> = {
      Name: 'name',
      Keyword: 'keyword',
      'Use case': 'useCase',
    };
    const filterKey = filterKeyMap[filterType] || filterType.toLowerCase();
    return cy.findByTestId(`filter-chip-${filterKey}`);
  }

  removeFilterChip(filterType: string) {
    this.findActiveFilterChip(filterType)
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
    return cy.findByTestId('model-info-popover-content');
  }

  closeModelInfoPopover() {
    cy.findByTestId('model-info-popover').findByRole('button', { name: /close/i }).click();
  }

  // Models Tab - Model Table Row Actions
  findTryInPlaygroundButton(modelName: string) {
    return this.findModelsTableRow(modelName).findByTestId('try-playground-button');
  }

  findAddToPlaygroundButton(modelName: string) {
    return this.findModelsTableRow(modelName).findByTestId('add-to-playground-button');
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
    const testId = status === 'Active' ? 'model-status-active' : 'model-status-inactive';
    this.findModelsTableRow(modelName).findByTestId(testId).should('exist');
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
    return this.findModelsTable().find('tbody tr[role="row"]').its('length');
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
