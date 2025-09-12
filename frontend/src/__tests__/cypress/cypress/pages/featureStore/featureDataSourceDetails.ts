import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';

class FeatureDataSourceDetails extends Contextual<HTMLElement> {
  findHeading() {
    return cy.findByText('Data Source Details');
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findApplicationsPageDescription() {
    return cy.findByTestId('app-page-description');
  }

  findDataSourceConnector() {
    return cy.findByTestId('data-source-join-key-value');
  }

  findFileUrl() {
    return cy.findByTestId('data-source-file-url-value');
  }

  findLastModified() {
    return cy.findByTestId('data-source-last-modified-value');
  }

  findCreated() {
    return cy.findByTestId('data-source-created-value');
  }

  findOwner() {
    return cy.findByTestId('data-source-owner-value');
  }

  findBatchDataSource() {
    return cy.findByTestId('data-source-batch-data-source-value');
  }

  findInteractiveExample() {
    return cy.findByTestId('data-source-interactive-example');
  }

  findBreadcrumbLink() {
    return cy.findByTestId('data-source-details-breadcrumb-link');
  }

  findBreadcrumbItem() {
    return cy.findByTestId('data-source-details-breadcrumb-item');
  }

  findDetailsTab() {
    return cy.findByTestId('data-source-details-tab');
  }

  findDetailsTabContent() {
    return cy.findByTestId('data-source-details-tab-content');
  }

  findFeatureViewsTab() {
    return cy.findByTestId('data-source-feature-views-tab');
  }

  findFeatureViewsTabContent() {
    return cy.findByTestId('data-source-feature-views-tab-content');
  }

  findSchemaTab() {
    return cy.findByTestId('data-source-schema-tab');
  }

  findSchemaTabContent() {
    return cy.findByTestId('data-source-schema-tab-content');
  }

  findFeatureViewsTable() {
    return cy.findByTestId('feature-view-data-sources-table');
  }

  findFeatureViewLineage() {
    return cy.findByTestId('feature-view-tab');
  }

  findLoadingSpinner() {
    return cy.findByTestId('loading-spinner');
  }

  findEmptyState() {
    return cy.findByText('No feature views');
  }

  clickDetailsTab() {
    return this.findDetailsTab();
  }

  clickFeatureViewsTab() {
    return this.findFeatureViewsTab();
  }

  clickSchemaTab() {
    return this.findSchemaTab();
  }

  shouldHaveApplicationsPageDescription(description: string) {
    this.findApplicationsPageDescription().should('contain.text', description);
    return this;
  }

  shouldHavePageTitle(title: string) {
    this.findPageTitle().should('have.text', title);
    return this;
  }

  shouldHaveDataSourceConnector(connector: string) {
    this.findDataSourceConnector().should('contain.text', connector);
    return this;
  }

  shouldHaveFileUrl(url: string) {
    this.findFileUrl().should('contain.text', url);
    return this;
  }

  shouldHaveOwner(owner: string) {
    this.findOwner().should('contain.text', owner);
    return this;
  }

  shouldHaveBatchDataSource(batchDataSource: string) {
    this.findBatchDataSource().should('contain.text', batchDataSource);
    return this;
  }

  shouldHaveFeatureViewsCount(count: number) {
    if (count === 0) {
      this.findEmptyState().should('exist');
    } else {
      this.findFeatureViewsTable().should('exist');
    }
    return this;
  }

  shouldShowLoadingSpinner() {
    this.findLoadingSpinner().should('exist');
    return this;
  }

  shouldShowFeatureViewsTable() {
    this.findFeatureViewsTable().should('exist');
    return this;
  }

  shouldShowSchemaTable() {
    this.findSchemaTabContent().should('exist');
    return this;
  }
}

export const featureDataSourceDetails = new FeatureDataSourceDetails(() =>
  cy.findByTestId('data-source-details-page'),
);
