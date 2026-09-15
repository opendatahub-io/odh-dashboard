import type { UserAuthConfig } from '../../types';

const FEATURE_STORE_ADMIN_DEV_FLAG = 'devFeatureFlags=featureStoreAdmin=true';

class FeatureStoreManagePage {
  visit() {
    cy.visitWithLogin(
      '/settings/environment-setup/feature-stores?devFeatureFlags=Feature+store+plugin%3Dtrue',
    );
    this.wait();
  }

  visitWithAdminFlag(user: UserAuthConfig) {
    cy.visitWithLogin(
      `/settings/environment-setup/feature-stores?${FEATURE_STORE_ADMIN_DEV_FLAG}`,
      user,
    );
    cy.testA11y();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('have.text', 'Feature stores');
    cy.testA11y();
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
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

  findRowByName(namespace: string, name: string, options?: { timeout?: number }) {
    return this.findTable().find(`[data-testid="feature-store-row-${namespace}-${name}"]`, options);
  }

  shouldNotHaveRow(namespace: string, name: string, timeout = 15000) {
    const rowTestId = `feature-store-row-${namespace}-${name}`;
    // Query from the document, not the table. After deleting the last store the
    // table is replaced by empty state, which detaches the table and breaks
    // findRowByName().should('not.exist').
    cy.get('body', { timeout }).should(($body) => {
      const listSettled =
        $body.find('[data-testid="feature-store-list-table"]').length > 0 ||
        $body.find('[data-testid="empty-feature-stores"]').length > 0;
      expect(listSettled, 'manage page finished loading after delete').to.eq(true);
      expect($body.find(`[data-testid="${rowTestId}"]`)).to.have.length(0);
    });
    return this;
  }

  findStatusBadge(namespace: string, name: string) {
    // Deployed clusters may not have data-testid on the Status cell or Label.
    // PatternFly always sets data-label="Status"; the phase text lives in __text.
    return this.findRowByName(namespace, name).find('[data-label="Status"] .pf-v6-c-label__text');
  }

  findExpandToggle(namespace: string, name: string) {
    return this.findRowByName(namespace, name).findByRole('button', { name: 'Details' });
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

  shouldBeClosed() {
    cy.findByRole('dialog', { timeout: 10000 }).should('not.exist');
    return this;
  }
}

export const featureStoreManagePage = new FeatureStoreManagePage();
export const deleteFeatureStoreModal = new DeleteFeatureStoreModal();
