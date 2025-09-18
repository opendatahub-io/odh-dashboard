import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';

class FeatureStoreGlobal {
  visit(project?: string) {
    cy.visitWithLogin(
      `/featureStore${project ? `/${project}` : ''}?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.wait();
  }

  visitFeatureViews(project: string) {
    const projectName = project;
    cy.visitWithLogin(
      `/featureStore/featureViews/${projectName}?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForFeatureViews();
  }

  visitEntities(project?: string) {
    cy.visitWithLogin(
      `/featureStore/entities${
        project ? `/${project}` : ''
      }?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForEntities();
  }

  visitDataSources(project?: string) {
    cy.visitWithLogin(
      `/featureStore/dataSources${
        project ? `/${project}` : ''
      }?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForDataSources();
  }

  visitFeatures(project?: string) {
    const projectName = project;
    cy.visitWithLogin(
      `/featureStore/features${
        projectName ? `/${projectName}` : ''
      }?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForFeatures();
  }

  visitDataSets(project?: string) {
    cy.visitWithLogin(
      `/featureStore/dataSets${
        project ? `/${project}` : ''
      }?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForDataSets();
  }

  visitDataSetDetails(project: string, dataSetName: string) {
    cy.visitWithLogin(
      `/featureStore/dataSets/${project}/${dataSetName}?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForDataSetDetails(dataSetName);
  }

  visitFeatureServices(project: string) {
    const projectName = project;
    cy.visitWithLogin(
      `/featureStore/featureServices/${projectName}?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForFeatureServices();
  }

  visitOverview(project?: string) {
    cy.visitWithLogin(
      `/featureStore/overview${
        project ? `/${project}` : ''
      }?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForOverview();
  }

  visitFeatureServiceDetails(project: string, featureService: string) {
    const projectName = project;
    cy.visitWithLogin(
      `/featureStore/featureServices/${projectName}/${featureService}?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.waitForFeatureServiceDetails(featureService);
  }

  navigate() {
    appChrome.findNavItem('Feature store').click();
    this.wait();
  }

  navigateToFeatureViews() {
    appChrome.findNavItem('Feature views').click();
    this.waitForFeatureViews();
  }

  navigateToEntities() {
    appChrome.findNavItem('Entities').click();
    this.waitForEntities();
  }

  navigateToFeatures() {
    appChrome.findNavItem('Features').click();
    this.waitForFeatures();
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
    cy.findByTestId('app-page-title').should('have.text', 'Data Sources');
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
