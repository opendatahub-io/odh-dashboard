import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';

class FeatureDetails extends Contextual<HTMLElement> {
  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findApplicationsPageDescription() {
    return cy.findByTestId('app-page-description');
  }

  findFeatureDetailsPage() {
    return cy.findByTestId('feature-details-page');
  }

  findFeatureDetailsTab() {
    return cy.findByTestId('feature-details-tab');
  }

  findFeatureViewsTab() {
    return cy.findByTestId('feature-views-tab');
  }

  findFeatureTypeLabel() {
    return cy.findByTestId('feature-type-label');
  }

  findFeatureValueType() {
    return cy.findByTestId('feature-value-type');
  }

  findFeatureTags() {
    return cy.findByTestId('feature-tags');
  }

  findFeatureInteractiveExample() {
    return cy.findByTestId('feature-interactive-example');
  }

  findBackButton() {
    return cy.findByTestId('back-button');
  }

  findBreadcrumbLink() {
    return cy.findByTestId('feature-details-breadcrumb-link');
  }

  findBreadcrumbItem() {
    return cy.findByTestId('feature-details-breadcrumb-item');
  }

  shouldHaveApplicationsPageDescription(description: string) {
    this.findApplicationsPageDescription().should('contain.text', description);
    return this;
  }

  shouldHavePageTitle(title: string) {
    this.findPageTitle().should('have.text', title);
    return this;
  }

  shouldHaveFeatureValueType(valueType: string) {
    this.findFeatureValueType().should('contain.text', valueType);
    return this;
  }

  shouldHaveFeatureTypeLabel(label: string) {
    this.findFeatureTypeLabel().should('contain.text', label);
    return this;
  }

  shouldHaveFeatureTags() {
    this.findFeatureTags().should('be.visible');
    return this;
  }

  shouldHaveFeatureInteractiveExample() {
    this.findFeatureInteractiveExample().should('be.visible');
    return this;
  }

  shouldHaveTabsExist() {
    this.findFeatureDetailsTab().should('exist');
    this.findFeatureViewsTab().should('exist');
    return this;
  }

  shouldHaveTabsVisibleAndClickable() {
    this.findFeatureDetailsTab().should('be.visible').and('not.be.disabled');
    this.findFeatureViewsTab().should('be.visible').and('not.be.disabled');
    return this;
  }

  shouldHaveFeatureViewsTabSelected() {
    this.findFeatureViewsTab().should('have.attr', 'aria-selected', 'true');
    this.findFeatureDetailsTab().should('have.attr', 'aria-selected', 'false');
    return this;
  }

  shouldHaveFeatureDetailsTabSelected() {
    this.findFeatureDetailsTab().should('have.attr', 'aria-selected', 'true');
    this.findFeatureViewsTab().should('have.attr', 'aria-selected', 'false');
    return this;
  }

  clickBackButton() {
    this.findBackButton().click();
  }

  clickFeatureDetailsTab() {
    this.findFeatureDetailsTab().click();
  }

  clickFeatureViewsTab() {
    this.findFeatureViewsTab().click();
  }

  testTabSwitching() {
    this.clickFeatureViewsTab();
    this.shouldHaveFeatureViewsTabSelected();
    this.clickFeatureDetailsTab();
    this.shouldHaveFeatureDetailsTabSelected();
    return this;
  }
}

export const featureDetails = new FeatureDetails(() => cy.findByTestId('feature-details-page'));
