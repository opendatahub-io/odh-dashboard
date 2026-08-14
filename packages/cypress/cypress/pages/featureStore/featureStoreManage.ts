class FeatureStoreManagePage {
  visit() {
    cy.visitWithLogin(
      '/settings/environment-setup/feature-stores?devFeatureFlags=Feature+store+plugin%3Dtrue',
    );
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('have.text', 'Feature stores');
    cy.testA11y();
  }

  findTable() {
    return cy.findByTestId('feature-store-list-table');
  }

  findEmptyState() {
    return cy.findByTestId('empty-feature-stores');
  }

  findCreateButton() {
    return cy.findByTestId('create-feature-store-toolbar-btn');
  }

  findEmptyStateCreateButton() {
    return cy.findByTestId('create-feature-store-empty-btn');
  }

  shouldHaveRowCount(count: number) {
    if (count === 0) {
      this.findEmptyState().should('exist');
    } else {
      this.findTable().find('[data-testid^="feature-store-row-"]').should('have.length', count);
    }
    return this;
  }

  findRowByName(namespace: string, name: string) {
    return this.findTable().find(`[data-testid="feature-store-row-${namespace}-${name}"]`);
  }

  findKebabAction(namespace: string, rowName: string, actionName: string) {
    this.findRowByName(namespace, rowName)
      .findByRole('button', { name: /kebab toggle/i })
      .click();
    return cy.findByRole('menuitem', { name: actionName });
  }
}

class DeleteFeatureStoreModal {
  shouldBeOpen(storeName: string) {
    cy.findByRole('dialog').should('be.visible');
    cy.findByRole('dialog').should('contain.text', `Delete feature store "${storeName}"`);
    return this;
  }

  findInput() {
    return cy.findByTestId('delete-modal-input');
  }

  findDeleteButton() {
    return cy.findByRole('dialog').findByRole('button', { name: /Delete feature store/i });
  }

  findCancelButton() {
    return cy.findByRole('dialog').findByRole('button', { name: /Cancel/i });
  }

  typeConfirmation(name: string) {
    this.findInput().clear().type(name);
    return this;
  }
}

export const featureStoreManagePage = new FeatureStoreManagePage();
export const deleteFeatureStoreModal = new DeleteFeatureStoreModal();
