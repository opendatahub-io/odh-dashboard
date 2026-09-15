import type { UserAuthConfig } from '../../types';

class DataRegistryPage {
  navigate(project?: string, credentials?: UserAuthConfig) {
    const projectQuery = project ? `?project=${encodeURIComponent(project)}` : '';
    cy.visitWithLogin(`/ai-hub/data/browse${projectQuery}`, credentials);
    this.findProjectSelector().should('be.visible');
  }

  visit(project: string) {
    cy.visit(`/data-registry?project=${project}`);
  }

  findProjectSelector() {
    return cy.findByTestId('project-selector');
  }

  findProjectOption(project: string) {
    return cy.findByRole('option', { name: project });
  }

  selectProject(project: string) {
    this.findProjectSelector().click();
    this.findProjectOption(project).click();
    this.findProjectSelector().should('contain.text', project);
  }

  findRegistryTable() {
    return cy.findByTestId('registry-table');
  }

  findAssetLink(assetName: string) {
    return this.findRegistryTable().findByRole('link', { name: assetName });
  }

  openAsset(assetName: string) {
    this.findAssetLink(assetName).click();
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findAssetTypeBadge() {
    return cy.findByTestId('asset-type-badge');
  }

  findCollectionBreadcrumb(collectionName: string) {
    return cy
      .findByRole('navigation', { name: /breadcrumb/i })
      .findByRole('link', { name: collectionName });
  }

  openCollectionFromBreadcrumb(collectionName: string) {
    this.findCollectionBreadcrumb(collectionName).click();
  }

  findCollectionDetailsCard() {
    return cy.findByTestId('collection-details-card');
  }

  findCollectionAssetsTable() {
    return cy.findByTestId('collection-assets-table');
  }

  findCollectionTypeBadge() {
    return cy.findByTestId('collection-type-badge');
  }

  waitForErrorState() {
    cy.get('[data-testid="error-display"]', { timeout: 10000 }).should('exist');
  }

  shouldShowServiceUnavailable() {
    cy.contains('Data Registry service is temporarily unavailable').should('be.visible');
  }

  shouldShowAccessDenied() {
    cy.contains('You do not have access to this project').should('be.visible');
  }

  shouldShowConnectionError() {
    cy.contains('Connection failed').should('be.visible');
  }

  shouldDisableRegisterDataButton() {
    cy.get('[data-testid="register-data-button"]').should('be.disabled');
  }

  shouldDisableManageCollectionsAction() {
    cy.get('[data-testid="actions-dropdown"]').click();
    cy.get('[data-testid="manage-collections-action"]').should(
      'have.attr',
      'aria-disabled',
      'true',
    );
  }

  shouldDisableManageLabelsAction() {
    cy.get('[data-testid="actions-dropdown"]').click();
    cy.get('[data-testid="manage-labels-action"]').should('have.attr', 'aria-disabled', 'true');
  }

  clickRetryButton() {
    cy.get('[data-testid="retry-button"]').click();
  }

  shouldShowData() {
    cy.get('[data-testid="registry-table"]').should('exist');
  }
}

export default new DataRegistryPage();
