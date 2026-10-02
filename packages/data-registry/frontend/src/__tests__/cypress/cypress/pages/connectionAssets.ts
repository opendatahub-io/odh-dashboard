import { editAssetModal } from './editAssetModal';

class ConnectionAssets {
  visit(kind: 'table' | 'volume') {
    cy.visit(`/ai-hub/data/browse/assets/${kind}/test-project/analytics/asset-a`);
    cy.wait('@getAsset');
    this.findConnection().should('exist');
    cy.testA11y();
  }

  findConnection() {
    return cy.findByTestId('connection-ref-label');
  }

  edit() {
    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-edit').click();
    editAssetModal.shouldBeOpen();
  }

  selectConnection(key: string) {
    this.findConnectionOption(key).findByRole('option').click();
  }

  findConnectionOption(key: string) {
    return cy.findByTestId(`connection-option-${key}`);
  }

  findLookupError() {
    return cy.findByTestId('connections-error');
  }
}

export const connectionAssets = new ConnectionAssets();
