import { mockStorageClassList } from '~/__mocks__';
import { asProductAdminUser } from '~/__tests__/cypress/cypress/utils/mockUsers';
import { pageNotfound } from '~/__tests__/cypress/cypress/pages/pageNotFound';
import { storageClassesPage } from '~/__tests__/cypress/cypress/pages/storageClasses';

describe('Storage classes', () => {
  it('shows "page not found" and does not show nav item as a non-admin user', () => {
    cy.visitWithLogin('/storageClasses');
    storageClassesPage.findNavItem().should('not.exist');
    pageNotfound.findPage().should('be.visible');
  });

  describe('as an admin user', () => {
    beforeEach(() => {
      asProductAdminUser();
    });

    it('shows empty state when the returned storage class list is empty', () => {
      cy.interceptOdh(
        'GET /api/k8s/apis/storage.k8s.io/v1/storageclasses',
        mockStorageClassList([]),
      );
      storageClassesPage.visit();
      storageClassesPage.findNavItem().should('be.visible');
      storageClassesPage.findEmptyState().should('be.visible');
    });
  });
});
