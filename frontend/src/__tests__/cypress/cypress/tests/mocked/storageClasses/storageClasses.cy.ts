import type { MockStorageClass } from '~/__mocks__';
import { mockStorageClassList, mockStorageClasses } from '~/__mocks__';
import { asProductAdminUser } from '~/__tests__/cypress/cypress/utils/mockUsers';
import { pageNotfound } from '~/__tests__/cypress/cypress/pages/pageNotFound';
import {
  storageClassEditModal,
  storageClassesPage,
  storageClassesTable,
} from '~/__tests__/cypress/cypress/pages/storageClasses';
import type { StorageClassConfig } from '~/k8sTypes';

describe('Storage classes', () => {
  it('shows "page not found" and does not show nav item as a non-admin user', () => {
    cy.visitWithLogin('/storageClasses');
    storageClassesPage.findNavItem().should('not.exist');
    pageNotfound.findPage().should('be.visible');
  });

  describe('as an admin user', () => {
    const [openshiftDefaultStorageClass, otherStorageClass] = mockStorageClasses;

    beforeEach(() => {
      asProductAdminUser();
    });

    it('shows empty state when the returned storage class list is empty', () => {
      cy.interceptOdh(
        'GET /api/k8s/apis/storage.k8s.io/v1/storageclasses',
        {},
        mockStorageClassList([]),
      );
      storageClassesPage.visit();
      storageClassesPage.findNavItem().should('be.visible');
      storageClassesPage.findEmptyState().should('be.visible');
    });

    it('renders table with data', () => {
      cy.interceptOdh(
        'GET /api/k8s/apis/storage.k8s.io/v1/storageclasses',
        {},
        mockStorageClassList(),
      );
      storageClassesPage.visit();

      storageClassesTable.findRowByName('Test SC 1').should('be.visible');
      storageClassesTable.findRowByName('openshift-default-sc').should('be.visible');
    });

    it('table rows allow for toggling of Enable and Default values', () => {
      cy.interceptOdh(
        'GET /api/k8s/apis/storage.k8s.io/v1/storageclasses',
        {},
        mockStorageClassList(),
      );
      storageClassesPage.visit();

      const openshiftDefaultTableRow = storageClassesTable.getRowByName('openshift-default-sc');
      openshiftDefaultTableRow.findOpenshiftDefaultLabel().should('be.visible');
      openshiftDefaultTableRow.findEnableSwitch().should('have.attr', 'aria-checked', 'true');
      openshiftDefaultTableRow.findEnableSwitch().should('have.attr', 'disabled');
      openshiftDefaultTableRow.findDefaultRadio().should('have.attr', 'checked');
      openshiftDefaultTableRow.findDefaultRadio().should('not.have.attr', 'disabled');

      const otherStorageClassTableRow = storageClassesTable.getRowByName('Test SC 1');
      otherStorageClassTableRow.findOpenshiftDefaultLabel().should('not.exist');
      otherStorageClassTableRow.findEnableSwitch().should('have.attr', 'aria-checked', 'false');
      otherStorageClassTableRow.findEnableSwitch().should('not.have.attr', 'disabled');
      otherStorageClassTableRow.findDefaultRadio().should('not.have.attr', 'checked');
      otherStorageClassTableRow.findDefaultRadio().should('have.attr', 'disabled');

      storageClassesTable
        .mockUpdateStorageClass(otherStorageClass.metadata.name, 1)
        .as('updateStorageClass-1');
      storageClassesTable
        .mockGetStorageClasses(
          [
            openshiftDefaultStorageClass,
            buildMockStorageClass(otherStorageClass, { isEnabled: true }),
          ],
          1,
        )
        .as('refreshStorageClasses-1');

      // Enable the other storage class so that the RHOAI default can be toggled
      otherStorageClassTableRow.findEnableSwitch().click({ force: true });
      cy.wait('@updateStorageClass-1');
      cy.wait('@refreshStorageClasses-1');

      otherStorageClassTableRow.findEnableSwitch().should('have.attr', 'aria-checked', 'true');
      otherStorageClassTableRow.findDefaultRadio().should('not.have.attr', 'disabled');

      storageClassesTable
        .mockUpdateStorageClass(otherStorageClass.metadata.name, 1)
        .as('updateStorageClass-2');
      storageClassesTable
        .mockUpdateStorageClass(openshiftDefaultStorageClass.metadata.name, 1)
        .as('updateStorageClass-3');
      storageClassesTable
        .mockGetStorageClasses(
          [
            buildMockStorageClass(openshiftDefaultStorageClass, { isDefault: false }),
            buildMockStorageClass(otherStorageClass, { isEnabled: true, isDefault: true }),
          ],
          1,
        )
        .as('refreshStorageClasses-2');

      // Set the other storage class as the RHOAI default
      otherStorageClassTableRow.findDefaultRadio().click();
      cy.wait('@updateStorageClass-2');
      cy.wait('@updateStorageClass-3');
      cy.wait('@refreshStorageClasses-2');

      openshiftDefaultTableRow.findEnableSwitch().should('not.have.attr', 'disabled');
      openshiftDefaultTableRow.findDefaultRadio().should('have.attr', 'checked');
    });

    it('can edit storage class display name and description', () => {
      cy.interceptOdh(
        'GET /api/k8s/apis/storage.k8s.io/v1/storageclasses',
        {},
        mockStorageClassList(),
      );
      storageClassesPage.visit();

      storageClassesTable.getRowByName('openshift-default-sc').findKebabAction('Edit').click();
      storageClassEditModal.findOpenshiftDefaultLabel().should('be.visible');
      storageClassEditModal.findCloseButton().click();

      storageClassesTable.getRowByName('Test SC 1').findKebabAction('Edit').click();
      storageClassEditModal.findOpenshiftScName().should('have.text', 'test-storage-class-1');
      storageClassEditModal.findProvisioner().should('have.text', 'manila.csi.openstack.org');
      storageClassEditModal.findOpenshiftDefaultLabel().should('not.exist');
      storageClassEditModal.fillDisplayNameInput('Updated name');
      storageClassEditModal.fillDescriptionInput('Updated description');

      storageClassEditModal.mockUpdateStorageClass('test-storage-class-1', 1);
      storageClassesTable
        .mockGetStorageClasses([
          openshiftDefaultStorageClass,
          buildMockStorageClass(otherStorageClass, {
            displayName: 'Updated name',
            description: 'Updated description',
          }),
        ])
        .as('updateStorageClass');
      storageClassEditModal.findSaveButton().click();

      cy.wait('@updateStorageClass');
      const updatedRow = storageClassesTable.getRowByName('Updated name');
      updatedRow.find().should('contain.text', 'Updated name');
      updatedRow.find().should('contain.text', 'Updated description');
    });
  });
});

const buildMockStorageClass = (
  mockStorageClass: MockStorageClass,
  config: Partial<StorageClassConfig>,
) => ({
  ...mockStorageClass,
  metadata: {
    ...mockStorageClass.metadata,
    annotations: {
      ...mockStorageClass.metadata.annotations,
      'opendatahub.io/sc-config': JSON.stringify({
        ...JSON.parse(String(mockStorageClass.metadata.annotations?.['opendatahub.io/sc-config'])),
        ...config,
      }),
    },
  },
});
