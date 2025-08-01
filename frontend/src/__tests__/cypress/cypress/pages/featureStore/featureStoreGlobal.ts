import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';

class FeatureStoreGlobal {
  visit(project?: string) {
    cy.visitWithLogin(`/featureStore${project ? `/${project}` : ''}`);
    this.wait();
  }

  visitFeatureViews(project: string) {
    const projectName = project;
    cy.visitWithLogin(`/featureStore/featureViews/${projectName}`);
    this.waitForFeatureViews();
  }

  visitEntities(project?: string) {
    cy.visitWithLogin(`/featureStore/entities${project ? `/${project}` : ''}`);
    this.waitForEntities();
  }

  visitFeatures(project?: string) {
    const projectName = project;
    cy.visitWithLogin(`/featureStore/features${projectName ? `/${projectName}` : ''}`);
    this.waitForFeatures();
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
    cy.findByTestId('app-page-title').should('have.text', 'Feature Store');
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
