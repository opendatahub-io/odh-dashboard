class EvaluationsPage {
  visit(namespace: string, tab?: 'gallery' | 'evaluate' | 'runs') {
    cy.visit(`/evaluation/${namespace}${tab ? `?tab=${tab}` : ''}`);
    this.waitForLoad(tab ?? 'gallery');
  }

  visitGallery(namespace: string) {
    this.visit(namespace, 'gallery');
  }

  visitEvaluate(namespace: string) {
    this.visit(namespace, 'evaluate');
  }

  visitRuns(namespace: string) {
    this.visit(namespace, 'runs');
  }

  visitBenchmarkSuites(namespace: string) {
    cy.visit(`/evaluation/${namespace}/collections`);
    this.waitForPageHeader();
    cy.get(
      '[data-testid="benchmark-suites-gallery"], [data-testid="benchmark-suites-empty-state"], [data-testid="benchmark-suites-load-error"]',
    )
      .filter(':visible')
      .should('have.length.at.least', 1);
    cy.testA11y();
  }

  visitInvalidProject(namespace: string) {
    cy.visit(`/evaluation/${namespace}`);
    this.waitForPageHeader();
    this.findInvalidProjectState().should('be.visible');
    cy.testA11y();
  }

  visitNoProjects() {
    cy.visit('/evaluation/any');
    this.waitForPageHeader();
    this.findNoProjectsState().should('be.visible');
    cy.testA11y();
  }

  visitRoot() {
    cy.visit('/evaluation');
  }

  private waitForLoad(tab: 'gallery' | 'evaluate' | 'runs') {
    this.waitForPageHeader();
    cy.wait('@evalHubHealth').then((interception) => {
      const responseBody = interception.response?.body as {
        data?: { available?: boolean };
        available?: boolean;
      };
      const isAvailable = responseBody.data?.available ?? responseBody.available;

      if (isAvailable === false) {
        return;
      }

      if (tab === 'runs') {
        cy.wait('@evalHubJobs');
      }
      cy.findByTestId(`${tab}-tab`).should('be.visible');
      cy.findByTestId(`${tab}-tab-content`).should('be.visible');
      cy.testA11y();
    });
  }

  private waitForPageHeader() {
    cy.findByTestId('app-page-title').should('be.visible');
  }

  findTitle() {
    return cy.findByTestId('app-page-title');
  }

  findPageDescription() {
    return cy.findByTestId('app-page-description');
  }

  findEvaluateTab() {
    return cy.findByTestId('evaluate-tab');
  }

  findGalleryTab() {
    return cy.findByTestId('gallery-tab');
  }

  findGalleryContent() {
    return cy.findByTestId('gallery-tab-content');
  }

  findRunsTab() {
    return cy.findByTestId('runs-tab');
  }

  findEvaluateContent() {
    return cy.findByTestId('evaluate-tab-content');
  }

  findRunsContent() {
    return cy.findByTestId('runs-tab-content');
  }

  findRunsDescription() {
    return cy.findByTestId('runs-tab-description');
  }

  findCreateSuiteCard() {
    return cy.findByTestId('create-suite-card');
  }

  findCreateSuiteButton() {
    return cy.findByTestId('create-suite-button');
  }

  findBrowseAllBenchmarksExploreButton() {
    return cy.findByTestId('browse-all-benchmarks-explore');
  }

  findBenchmarkSuiteCard(collectionId: string) {
    return cy.findByTestId(`benchmark-suite-card-${collectionId}`);
  }

  findBenchmarkSuiteName(collectionId: string) {
    return cy.findByTestId(`benchmark-suite-card-name-${collectionId}`);
  }

  findCollectionDrawerPanel() {
    return cy.findByTestId('collection-drawer-panel');
  }

  findBenchmarkSuiteMenu(collectionId: string) {
    return cy.findByTestId(`benchmark-suite-card-menu-${collectionId}`);
  }

  findBenchmarkSuiteAction(action: string, collectionId: string) {
    return cy.findByTestId(`benchmark-suite-card-action-${action}-${collectionId}`).find('button');
  }

  findBenchmarkSuiteDeleteModal() {
    return cy.findByTestId('benchmark-suite-delete-modal');
  }

  findBenchmarkSuiteDeleteCancel() {
    return cy.findByTestId('benchmark-suite-delete-cancel');
  }

  findBenchmarkSuitePrimaryAction(collectionId: string) {
    return cy.findByTestId(`benchmark-suite-card-primary-action-${collectionId}`);
  }

  findBenchmarkSuiteDropdownToggle(collectionId: string) {
    return cy.findByTestId(`benchmark-suite-card-dropdown-toggle-${collectionId}`);
  }

  findBenchmarkSuiteDropdownAction(collectionId: string) {
    return cy.findByTestId(`benchmark-suite-card-dropdown-action-${collectionId}`);
  }

  findCuratedSuiteRunModal() {
    return cy.findByTestId('curated-suite-start-evaluation-run-modal');
  }

  findBenchmarkSuitesNameFilter() {
    return cy.findByTestId('benchmark-suites-name-filter');
  }

  findBenchmarkSuitesCategoryFilter() {
    return cy.findByTestId('benchmark-suites-category-filter');
  }

  findBenchmarkSuitesCategoryFilterBadge() {
    return cy.findByTestId('benchmark-suites-category-filter-badge');
  }

  findBenchmarkSuitesEvaluatesFilter() {
    return cy.findByTestId('benchmark-suites-evaluates-filter');
  }

  findBenchmarkSuitesIndustryFilter() {
    return cy.findByTestId('benchmark-suites-industry-filter');
  }

  findBenchmarkSuitesTagsFilter() {
    return cy.findByTestId('benchmark-suites-tags-filter');
  }

  findBenchmarkSuitesTaskFilter() {
    return cy.findByTestId('benchmark-suites-task-filter');
  }

  findBenchmarkSuitesModalityFilter() {
    return cy.findByTestId('benchmark-suites-modality-filter');
  }

  findBenchmarkSuitesPagination() {
    return cy.findByTestId('benchmark-suites-pagination-top');
  }

  findBenchmarkSuitesFilterOption(
    filter: 'category' | 'evaluates' | 'industry' | 'tags' | 'task' | 'modality',
    value: string,
  ) {
    return cy
      .findByTestId(`benchmark-suites-${filter}-filter-select`)
      .findByTestId(`benchmark-suites-${filter}-filter-option-${value}`);
  }

  findBenchmarkSuitesSummary() {
    return cy.findByTestId('benchmark-suites-summary');
  }

  findCuratedSuiteCategories() {
    return cy.findByTestId('curated-suite-categories');
  }

  findCuratedSuiteCategoryCard(categoryId: string) {
    return cy.findByTestId(`curated-suite-category-card-${categoryId}`);
  }

  findEmptyState() {
    return cy.findByTestId('eval-hub-empty-state');
  }

  findEmptyStateBody() {
    return cy.findByTestId('eval-hub-empty-state-body');
  }

  findCreateEvaluationButton() {
    return cy.findByTestId('create-evaluation-button');
  }

  findEvaluationsTable() {
    return cy.findByTestId('evaluations-table');
  }

  findEvaluationsTableToolbar() {
    return cy.findByTestId('evaluations-table-toolbar');
  }

  findFilterTypeToggle() {
    return cy.findByTestId('filter-type-toggle');
  }

  findFilterTextField() {
    return cy.findByTestId('filter-toolbar-text-field');
  }

  findUnavailableEmptyState() {
    return cy.findByTestId('evalhub-unavailable-empty-state');
  }

  findEmptyFilterState() {
    return cy.findByTestId('dashboard-empty-table-state');
  }

  findClearFiltersButton() {
    return cy.findByTestId('clear-filters-button');
  }

  findProjectSelector() {
    return cy.findByTestId('eval-hub-project-selector');
  }

  findNoProjectsState() {
    return cy.findByTestId('eval-hub-no-projects');
  }

  findInvalidProjectState() {
    return cy.findByTestId('eval-hub-invalid-project');
  }

  findEvaluationRow(rowIndex: number) {
    return cy.findByTestId(`evaluation-row-${rowIndex}`);
  }

  findEvaluationLink(rowIndex: number) {
    return cy.findByTestId(`evaluation-link-${rowIndex}`);
  }

  findCompareButton() {
    return cy.findByTestId('compare-evaluations-button');
  }

  // PF v6 Checkbox spreads extra props onto <input>, so data-testid is on the <input> directly.
  findEvaluationCheckbox(rowIndex: number) {
    return cy.findByTestId(`evaluation-select-checkbox-${rowIndex}`);
  }

  findStatusCell(rowIndex: number) {
    return this.findEvaluationRow(rowIndex).findByTestId('evaluation-status');
  }

  findStatusLabel(rowIndex: number) {
    return this.findStatusCell(rowIndex).findByTestId('evaluation-status-button');
  }

  clickStatusBadge(rowIndex: number) {
    this.findStatusCell(rowIndex).findByTestId('evaluation-status-button').click();
  }

  findStatusModal() {
    return cy.findByTestId('evaluation-status-modal');
  }

  findStatusModalBadge(state: string) {
    return this.findStatusModal().findByTestId(`status-label-${state}`);
  }

  findStatusDetailHeader() {
    return cy.findByTestId('status-detail-header');
  }

  findBenchmarkWarning(benchmarkId: string) {
    return cy.findByTestId(`benchmark-warning-${benchmarkId}`);
  }
}

export const evaluationsPage = new EvaluationsPage();
