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

  findRegisterDataButton() {
    return cy.findByTestId('register-data-button');
  }

  findRegistryActions() {
    return cy.findByTestId('registry-kebab');
  }

  findManageCollectionsAction() {
    return cy.findByTestId('manage-collections-action');
  }

  openManageCollections() {
    this.findRegistryActions().click();
    this.findManageCollectionsAction().click();
    this.findManageCollectionsModal().should('be.visible');
  }

  findManageCollectionsModal() {
    return cy.findByTestId('manage-collections-modal');
  }

  findCollectionsTable() {
    return this.findManageCollectionsModal().findByTestId('collections-table');
  }

  findCollectionLink(collectionName: string) {
    return this.findCollectionsTable().findByRole('link', { name: collectionName });
  }

  findCreateCollectionButton() {
    return this.findManageCollectionsModal().findByTestId('create-collection-button');
  }

  findCreateCollectionModal() {
    return cy.findByTestId('create-collection-modal');
  }

  findCollectionNameInput() {
    return this.findCreateCollectionModal().findByTestId('collection-name-input');
  }

  findCollectionDescriptionInput() {
    return this.findCreateCollectionModal().findByTestId('collection-description-input');
  }

  findCreateCollectionSubmit() {
    return this.findCreateCollectionModal().findByTestId('create-collection-submit');
  }

  closeManageCollections() {
    this.findManageCollectionsModal().findByRole('button', { name: 'Close' }).click();
  }

  findCollectionDeleteButton(collectionName: string) {
    return this.findManageCollectionsModal().findByTestId(`collection-delete-${collectionName}`);
  }

  findDeleteCollectionModal() {
    return cy.findByTestId('delete-collection-modal');
  }

  findDeleteCollectionConfirmation() {
    return this.findDeleteCollectionModal().findByTestId('confirm-delete-input');
  }

  findDeleteCollectionConfirmButton() {
    return this.findDeleteCollectionModal().findByTestId('confirm-delete-button');
  }

  findRegisterDataModal() {
    return cy.findByTestId('register-data-modal');
  }

  findDataNameInput() {
    return this.findRegisterDataModal().findByTestId('data-name-input');
  }

  findDataDescriptionInput() {
    return cy.findByTestId('data-description-input');
  }

  findDataCollectionToggle() {
    return this.findRegisterDataModal().findByTestId('data-collection-toggle');
  }

  selectDataCollection(collectionName: string) {
    this.findDataCollectionToggle().click();
    this.findRegisterDataModal().findByRole('option', { name: collectionName }).click();
  }

  findRegisterDataSubmit() {
    return this.findRegisterDataModal().findByTestId('register-data-submit');
  }

  findAssetActionsToggle() {
    return cy.findByTestId('asset-actions-toggle');
  }

  findEditAssetAction() {
    return cy.findByTestId('asset-action-edit');
  }

  findDeleteAssetAction() {
    return cy.findByTestId('asset-action-delete');
  }

  findEditAssetModal() {
    return cy.findByTestId('edit-asset-modal');
  }

  findEditAssetSave() {
    return this.findEditAssetModal().findByTestId('edit-asset-save');
  }

  findDeleteAssetModal() {
    return cy.findByTestId('delete-asset-modal');
  }

  findDeleteAssetConfirmation() {
    return this.findDeleteAssetModal().findByTestId('delete-asset-confirmation');
  }

  findDeleteAssetConfirm() {
    return this.findDeleteAssetModal().findByTestId('delete-asset-confirm');
  }

  findAssetDescription() {
    return cy.findByTestId('asset-description');
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
    cy.findByTestId('error-display', { timeout: 10000 }).should('exist');
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
    this.findRegisterDataButton().should('be.disabled');
  }

  shouldDisableManageCollectionsAction() {
    this.findRegistryActions().click();
    this.findManageCollectionsAction().should('have.attr', 'aria-disabled', 'true');
  }

  shouldDisableManageLabelsAction() {
    this.findRegistryActions().click();
    cy.findByTestId('manage-labels-action').should('have.attr', 'aria-disabled', 'true');
  }

  clickRetryButton() {
    cy.findByTestId('retry-button').click();
  }

  shouldShowData() {
    this.findRegistryTable().should('exist');
  }
}

export default new DataRegistryPage();
