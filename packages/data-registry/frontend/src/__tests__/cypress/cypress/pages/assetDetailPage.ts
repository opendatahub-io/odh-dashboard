class AssetDetailPage {
  findActionsToggle() {
    return cy.findByTestId('asset-actions-toggle');
  }

  findEditAction() {
    return cy.findByTestId('asset-action-edit');
  }
}

export const assetDetailPage = new AssetDetailPage();
