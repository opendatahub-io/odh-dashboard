import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';
import type { UserAuthConfig } from '#~/__tests__/cypress/cypress/types';

const FEAST_FEATURE_FLAGS =
  'devFeatureFlags=disableFeatureStore%3Dfalse%2CFeature+store+plugin%3Dtrue';

class FeatureStoreGlobal {
  visit(project?: string) {
    cy.visitWithLogin(`/featureStore${project ? `/${project}` : ''}?${FEAST_FEATURE_FLAGS}`);
    this.wait();
  }

  visitFeatureStore(project?: string, user?: UserAuthConfig) {
    const url = `/featureStore${project ? `/${project}` : ''}?${FEAST_FEATURE_FLAGS}`;
    if (user) {
      cy.visitWithLogin(url, user);
    } else {
      cy.visitWithLogin(url);
    }
    appChrome.findNavSection('Feature store').click();
    appChrome.findNavItem('Overview').click();
    this.wait();
  }

  visitFeatureViews(project: string) {
    const projectName = project;
    cy.visitWithLogin(`/featureStore/featureViews/${projectName}/?${FEAST_FEATURE_FLAGS}`);
    this.waitForFeatureViews();
  }

  visitEntities(project?: string) {
    cy.visitWithLogin(
      `/featureStore/entities${project ? `/${project}` : ''}/?${FEAST_FEATURE_FLAGS}`,
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
      `/featureStore/features${projectName ? `/${projectName}` : ''}/?${FEAST_FEATURE_FLAGS}`,
    );
    this.waitForFeatures();
  }

  visitDataSets(project?: string) {
    cy.visitWithLogin(
      `/featureStore/dataSets${project ? `/${project}` : ''}/?${FEAST_FEATURE_FLAGS}`,
    );
    this.waitForDataSets();
  }

  visitDataSetDetails(project: string, dataSetName: string) {
    cy.visitWithLogin(`/featureStore/dataSets/${project}/${dataSetName}/?${FEAST_FEATURE_FLAGS}`);
    this.waitForDataSetDetails(dataSetName);
  }

  visitFeatureServices(project: string) {
    const projectName = project;
    cy.visitWithLogin(`/featureStore/featureServices/${projectName}/?${FEAST_FEATURE_FLAGS}`);
    this.waitForFeatureServices();
  }

  visitOverview(project?: string) {
    cy.visitWithLogin(
      `/featureStore/overview${project ? `/${project}` : ''}/?${FEAST_FEATURE_FLAGS}`,
    );
    this.waitForOverview();
  }

  visitFeatureServiceDetails(project: string, featureService: string) {
    const projectName = project;
    cy.visitWithLogin(
      `/featureStore/featureServices/${projectName}/${featureService}/?${FEAST_FEATURE_FLAGS}`,
    );
    this.waitForFeatureServiceDetails(featureService);
  }

  navigate() {
    appChrome.findNavItem('Feature store').click();
    this.wait();
  }

  navigateToOverview() {
    appChrome.findNavItem('Overview').click();
    this.waitForOverview();
  }

  navigateToFeatureViews() {
    appChrome.findNavItem('Feature views').click();
    this.waitForFeatureViews();
  }

  navigateToDataSources() {
    appChrome.findNavItem('Data sources').click();
    this.waitForDataSources();
  }

  navigateToDatasets() {
    appChrome.findNavItem('Datasets').click();
    this.waitForDataSets();
  }

  navigateToEntities() {
    appChrome.findNavItem('Entities').click();
    this.waitForEntities();
  }

  navigateToFeatures() {
    appChrome.findNavItem('Features').click();
    this.waitForFeatures();
  }

  navigateToFeatureServices() {
    appChrome.findNavItem('Feature services').click();
    this.waitForFeatureServices();
  }

  findHeading() {
    return cy.findByTestId('app-page-title');
  }

  private wait() {
    cy.findByTestId('app-page-title').should('have.text', 'Feature store');
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
    cy.findByTestId('app-page-title').should('have.text', 'Feature store');
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
