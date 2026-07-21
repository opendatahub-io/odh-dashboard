import { appChrome } from '../appChrome';
import { Contextual } from '../components/Contextual';

class FeatureStoreGlobal {
  visit(project?: string) {
    cy.visitWithLogin(
      `/develop-train/feature-store${
        project ? `/${project}` : ''
      }?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.wait();
  }

  visitFeatureViews(project: string) {
    const projectName = project;
    cy.visitWithLogin(
      `/develop-train/feature-store/feature-views/${projectName}?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForFeatureViews();
  }

  visitEntities(project?: string) {
    cy.visitWithLogin(
      `/develop-train/feature-store/entities${
        project ? `/${project}` : ''
      }?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForEntities();
  }

  visitDataSources(project?: string) {
    cy.visitWithLogin(
      `/develop-train/feature-store/data-sources${
        project ? `/${project}` : ''
      }?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForDataSources();
  }

  visitFeatures(project?: string) {
    const projectName = project;
    cy.visitWithLogin(
      `/develop-train/feature-store/features${
        projectName ? `/${projectName}` : ''
      }?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForFeatures();
  }

  visitDataSets(project?: string) {
    cy.visitWithLogin(
      `/develop-train/feature-store/datasets${
        project ? `/${project}` : ''
      }?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForDataSets();
  }

  visitDataSetDetails(project: string, dataSetName: string) {
    cy.visitWithLogin(
      `/develop-train/feature-store/datasets/${project}/${dataSetName}?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForDataSetDetails(dataSetName);
  }

  visitFeatureServices(project: string) {
    const projectName = project;
    cy.visitWithLogin(
      `/develop-train/feature-store/feature-services/${projectName}?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForFeatureServices();
  }

  visitOverview(project?: string) {
    cy.visitWithLogin(
      `/develop-train/feature-store/overview${
        project ? `/${project}` : ''
      }?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForOverview();
  }

  visitFeatureServiceDetails(project: string, featureService: string) {
    const projectName = project;
    cy.visitWithLogin(
      `/develop-train/feature-store/feature-services/${projectName}/${featureService}?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForFeatureServiceDetails(featureService);
  }

  navigateToOverview() {
    appChrome
      .findNavItem({
        name: 'Overview',
        rootSection: 'Develop & train',
        subSection: 'Feature store',
      })
      .click();
    this.waitForOverview();
  }

  navigateToFeatureViews() {
    appChrome
      .findNavItem({
        name: 'Feature views',
        rootSection: 'Develop & train',
        subSection: 'Feature store',
      })
      .click();
    this.waitForFeatureViews();
  }

  navigateToEntities() {
    appChrome
      .findNavItem({
        name: 'Entities',
        rootSection: 'Develop & train',
        subSection: 'Feature store',
      })
      .click();
    this.waitForEntities();
  }

  navigateToFeatures() {
    appChrome
      .findNavItem({
        name: 'Features',
        rootSection: 'Develop & train',
        subSection: 'Feature store',
      })
      .click();
    this.waitForFeatures();
  }

  navigateToDataSources() {
    appChrome
      .findNavItem({
        name: 'Data sources',
        rootSection: 'Develop & train',
        subSection: 'Feature store',
      })
      .click();
    this.waitForDataSources();
  }

  navigateToDatasets() {
    appChrome
      .findNavItem({
        name: 'Datasets',
        rootSection: 'Develop & train',
        subSection: 'Feature store',
      })
      .click();
    this.waitForDataSets();
  }

  navigateToFeatureServices() {
    appChrome
      .findNavItem({
        name: 'Feature services',
        rootSection: 'Develop & train',
        subSection: 'Feature store',
      })
      .click();
    this.waitForFeatureServices();
  }

  findHeading() {
    return cy.findByTestId('app-page-title');
  }

  private wait() {
    cy.findByTestId('app-page-title').should('have.text', 'Feature store overview');
    cy.testA11y();
  }

  private waitForFeatureViews() {
    cy.findByTestId('app-page-title').should('have.text', 'Feature views');
    cy.testA11y();
  }

  private waitForEntities() {
    cy.findByTestId('app-page-title').should('have.text', 'Entities');
    cy.testA11y();
  }

  private waitForFeatures() {
    cy.findByTestId('app-page-title').should('have.text', 'Features');
    cy.testA11y();
  }

  private waitForDataSets() {
    cy.findByTestId('app-page-title').should('have.text', 'Datasets');
    cy.testA11y();
  }

  private waitForDataSetDetails(dataSetName: string) {
    cy.findByTestId('app-page-title').should('have.text', dataSetName);
    cy.testA11y();
  }

  private waitForFeatureServices() {
    cy.findByTestId('app-page-title').should('have.text', 'Feature services');
    cy.testA11y();
  }

  private waitForOverview() {
    cy.findByTestId('app-page-title').should('have.text', 'Feature store overview');
    cy.testA11y();
  }

  private waitForFeatureServiceDetails(serviceName: string) {
    cy.findByTestId('app-page-title').should('have.text', serviceName);
    cy.testA11y();
  }

  private waitForDataSources() {
    cy.findByTestId('app-page-title').should('have.text', 'Data sources');
    cy.testA11y();
  }

  shouldBeEmpty() {
    cy.findByTestId('empty-state-title').should('exist');
    return this;
  }

  shouldShowNoFeatureStoreService() {
    cy.findByTestId('empty-state-feature-store').should('exist');
    return this;
  }

  findProjectSelector() {
    return cy.findByTestId('feature-store-project-selector-toggle');
  }

  findProjectSelectorDropdown() {
    return cy.findByTestId('feature-store-project-selector-menu');
  }

  selectProject(projectName: string) {
    this.findProjectSelector().click();
    this.findProjectSelectorDropdown().should('contain.text', projectName);
    this.findProjectSelectorDropdown().findByRole('menuitem', { name: projectName }).click();
  }

  findGlobalSearchInput() {
    return cy.findByTestId('global-search-input').find('input');
  }

  findGlobalSearchContainer() {
    return cy.findByTestId('global-search-input-container');
  }

  findGlobalSearchMenu() {
    return cy.findByTestId('global-search-menu');
  }

  findGlobalSearchResultsHeader() {
    return cy.findByTestId('global-search-results-header');
  }

  findGlobalSearchResultsCount() {
    return cy.findByTestId('global-search-results-count');
  }

  findGlobalSearchMenuContent() {
    return cy.findByTestId('global-search-menu-content');
  }

  findGlobalSearchMenuList() {
    return cy.findByTestId('global-search-menu-list');
  }

  findGlobalSearchNoResults() {
    return cy.findByTestId('global-search-no-results');
  }

  findGlobalSearchLoadingSpinner() {
    return cy.findByTestId('global-search-loading-spinner');
  }

  findGlobalSearchNoResultsText() {
    return cy.findByTestId('global-search-no-results-text');
  }

  findGlobalSearchLoadMore() {
    return cy.findByTestId('global-search-load-more');
  }

  findGlobalSearchGroup(categoryName: string) {
    const testId = `global-search-group-${categoryName.toLowerCase().replace(/\s+/g, '-')}`;
    return cy.findByTestId(testId);
  }

  findGlobalSearchItem(type: string, title: string) {
    const testId = `global-search-item-${type}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return cy.findByTestId(testId);
  }

  findGlobalSearchMatchedTag(key: string) {
    return cy.findByTestId(`global-search-matched-tag-${key}`);
  }

  findGlobalSearchTooltip() {
    return cy.findByTestId('global-search-tooltip');
  }

  findConnectedWorkbenchesLink() {
    return cy.findByTestId('connected-workbenches-link');
  }

  findConnectedWorkbenchesModal() {
    return cy.findByRole('dialog', { name: /Connected workbenches/i });
  }

  findConnectedWorkbenchesModalProjectSelector() {
    return cy.findByTestId('connected-workbenches-modal-search-toggle');
  }

  findConnectedWorkbenchesEmptyState() {
    return cy.findByTestId('connected-workbenches-empty-state');
  }

  findConnectedWorkbenchesTable() {
    return cy.findByTestId('connected-workbenches-table');
  }

  findConnectedWorkbenchNone() {
    return cy.findByTestId('connected-workbench-none');
  }

  openConnectedWorkbenchesModal() {
    this.findConnectedWorkbenchesLink().click();
    this.findConnectedWorkbenchesModal().should('be.visible');
    return this;
  }

  findPaginationToggle() {
    return cy.get('#table-pagination-top-toggle');
  }

  findFilterTypeToggle() {
    return cy.findByTestId('filter-type-toggle');
  }

  findFilterTypeOption(filterType: string) {
    return cy.findByTestId(`filter-type-option-${filterType}`);
  }

  findProjectFilterToggle() {
    return cy.findByTestId('project-filter-toggle');
  }

  findProjectGroupHeader(group: 'with' | 'without') {
    return cy.findByTestId(`project-group-header-${group}`);
  }

  findProjectOption(project: string) {
    return cy.findByTestId(`project-option-${project}`);
  }

  findPermissionFilterToggle() {
    return cy.findByTestId('permission-filter-toggle');
  }

  findPermissionOption(permission: string) {
    return cy.findByTestId(`permission-option-${permission}`);
  }

  findWorkbenchNameFilterInput() {
    return cy.findByTestId('workbench-name-filter-input');
  }

  findHideConnectedWorkbenchesSwitch() {
    return cy.pfSwitch('hide-connected-workbenches-switch');
  }
}

class FeatureStoreProjectSelector extends Contextual<HTMLElement> {
  findDropdown() {
    return this.find().findByTestId('feature-store-project-selector-dropdown');
  }

  findProjectOption(projectName: string) {
    return cy.findByRole('menuitem', { name: projectName });
  }

  selectProject(projectName: string) {
    this.findDropdown().click();
    this.findProjectOption(projectName).click();
  }

  shouldHaveSelectedProject(projectName: string) {
    this.findDropdown().should('contain.text', projectName);
    return this;
  }
}

export const featureStoreGlobal = new FeatureStoreGlobal();

export const featureStoreProjectSelector = new FeatureStoreProjectSelector(() =>
  cy.findByTestId('feature-store-project-selector'),
);
