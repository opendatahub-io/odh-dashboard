import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';

class FeatureEntityDetails extends Contextual<HTMLElement> {
  findHeading() {
    return cy.findByText('Entity Details');
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findApplicationsPageDescription() {
    return cy.findByTestId('app-page-description');
  }

  findValueType() {
    return cy.findByTestId('entity-value-type-value');
  }

  findJoinKey() {
    return cy.findByTestId('entity-join-key-value');
  }

  findOwner() {
    return cy.findByTestId('entity-owner');
  }

  findTags() {
    return cy.findByTestId('feature-store-tags-group');
  }

  findInteractiveExample() {
    return cy.findByTestId('entity-interactive-example');
  }

  findCreatedDate() {
    return cy.findByTestId('entity-created-date');
  }

  findUpdatedDate() {
    return cy.findByTestId('entity-updated-date');
  }

  findProject() {
    return cy.findByTestId('entity-project');
  }

  findFeatureViewsSection() {
    return cy.findByTestId('entity-feature-views-section');
  }

  findBackButton() {
    return cy.findByTestId('back-button');
  }

  findBreadcrumbLink() {
    return cy.findByTestId('entity-details-breadcrumb-link');
  }

  findBreadcrumbItem() {
    return cy.findByTestId('entity-details-breadcrumb-item');
  }

  findDataSource() {
    return cy.findByTestId('entity-data-source');
  }

  findPropertiesTable() {
    return cy.findByTestId('properties-table');
  }

  shouldHaveApplicationsPageDescription(description: string) {
    this.findApplicationsPageDescription().should('contain.text', description);
    return this;
  }

  shouldHavePageTitle(title: string) {
    this.findPageTitle().should('have.text', title);
    return this;
  }

  shouldHaveValueType(valueType: string) {
    this.findValueType().should('contain.text', valueType);
    return this;
  }

  shouldHaveJoinKey(joinKey: string) {
    this.findJoinKey().should('contain.text', joinKey);
    return this;
  }

  clickBackButton() {
    this.findBackButton().click();
  }
}

export const featureEntityDetails = new FeatureEntityDetails(() =>
  cy.findByTestId('entity-details-page'),
);
