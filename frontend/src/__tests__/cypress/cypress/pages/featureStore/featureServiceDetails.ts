import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';

class FeatureServiceDetails {
  visit(project: string, featureServiceName: string) {
    cy.visitWithLogin(
      `/develop-train/feature-store/feature-services/${project}/${featureServiceName}?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    this.wait(featureServiceName);
  }

  private wait(featureServiceName: string) {
    cy.findByTestId('app-page-title').should('have.text', featureServiceName);
  }

  findHeading() {
    return cy.findByTestId('app-page-title');
  }

  findLoadingSpinner() {
    return cy.get('.pf-v6-c-spinner');
  }

  findErrorState() {
    return cy.findByTestId('error-empty-state');
  }

  findErrorMessage() {
    return this.findErrorState().find('.pf-v6-c-empty-state__body');
  }

  findBreadcrumb() {
    return new FeatureServiceDetailsBreadcrumb(() => cy.get('.pf-v6-c-breadcrumb'));
  }

  findDetailsTabs() {
    return new FeatureServiceDetailsTabs(() => cy.findByTestId('feature-details-page'));
  }

  shouldShowLoadingState() {
    this.findLoadingSpinner().should('exist');
    return this;
  }

  shouldShowErrorState() {
    this.findErrorState().should('exist');
    return this;
  }

  shouldShowErrorMessage(message: string) {
    this.findErrorMessage().should('contain.text', message);
    return this;
  }

  shouldHaveTitle(title: string) {
    this.findHeading().should('have.text', title);
    return this;
  }
}

class FeatureServiceDetailsBreadcrumb extends Contextual<HTMLElement> {
  findBreadcrumbLink() {
    return cy.findByTestId('feature-service-details-breadcrumb-link');
  }

  findBreadcrumbItem() {
    return cy.findByTestId('breadcrumb-feature-service-name');
  }

  clickFeatureServicesLink() {
    this.findBreadcrumbLink().click();
    return this;
  }

  shouldShowCurrentService(serviceName: string) {
    this.findBreadcrumbItem().should('have.text', serviceName);
    return this;
  }
}

class FeatureServiceDetailsTabs extends Contextual<HTMLElement> {
  findDetailsTab() {
    return this.find().findByTestId('feature-service-details-tab');
  }

  findFeatureViewsTab() {
    return this.find().findByTestId('feature-views-tab');
  }

  findActiveTab() {
    return this.find().find('.pf-v6-c-tabs__link[aria-selected="true"]');
  }

  findTabContent(testId: string) {
    return cy.findByTestId(testId);
  }

  clickDetailsTab() {
    this.findDetailsTab().click();
    return this;
  }

  clickFeatureViewsTab() {
    this.findFeatureViewsTab().click();
    return this;
  }

  shouldHaveDetailsTabSelected() {
    this.findActiveTab().should('contain.text', 'Details');
    return this;
  }

  shouldHaveFeatureViewsTabSelected() {
    this.findActiveTab().should('contain.text', 'Feature views');
    return this;
  }

  shouldHaveDetailsTabContent() {
    this.findTabContent('feature-service-details-tab').should('exist');
    return this;
  }

  shouldHaveFeatureViewsTabContent() {
    this.findTabContent('feature-views-table').should('exist');
    return this;
  }
}

class FeatureServiceDetailsPage {
  findOverviewLabel() {
    return cy.findByTestId('feature-overview-label');
  }

  findOverviewValue() {
    return cy.findByTestId('feature-overview-value');
  }

  findCreatedAtLabel() {
    return cy.findByTestId('feature-created-at-label');
  }

  findCreatedAtValue() {
    return cy.findByTestId('feature-created-at-value');
  }

  findUpdatedAtLabel() {
    return cy.findByTestId('feature-updated-at-label');
  }

  findUpdatedAtValue() {
    return cy.findByTestId('feature-updated-at-value');
  }

  findCodeBlock() {
    return cy.findByTestId('feature-code-block');
  }

  shouldHaveCodeBlock() {
    this.findCodeBlock().should('exist');
    return this;
  }
}

export const featureServiceDetails = new FeatureServiceDetails();
export const featureServiceDetailsBreadcrumb = new FeatureServiceDetailsBreadcrumb(() =>
  cy.findByTestId('feature-service-details-page'),
);
export const featureServiceDetailsTabs = new FeatureServiceDetailsTabs(() =>
  cy.findByTestId('feature-details-page'),
);
export const featureServiceDetailsPage = new FeatureServiceDetailsPage();
