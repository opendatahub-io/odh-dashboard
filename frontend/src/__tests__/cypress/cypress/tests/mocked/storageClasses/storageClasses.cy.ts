import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import {
  buildMockStorageClass,
  buildMockStorageClassConfig,
  mockStorageClasses,
} from '#~/__mocks__';
import { asProductAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { pageNotfound } from '#~/__tests__/cypress/cypress/pages/pageNotFound';
import {
  storageClassEditModal,
  storageClassesPage,
  storageClassesTable,
} from '#~/__tests__/cypress/cypress/pages/storageClasses';

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
      storageClassesPage.mockGetStorageClasses([]);
      storageClassesPage.visit();
      storageClassesPage.findNavItem().should('be.visible');
      storageClassesPage.findEmptyState().should('be.visible');
    });

    it('renders table with data', () => {
      storageClassesPage.mockGetStorageClasses();
      storageClassesPage.visit();

      storageClassesTable.findRowByName('Test SC 1').should('be.visible');
      storageClassesTable.findRowByName('openshift-default-sc').should('be.visible');
    });

    it('displays the correct access mode labels', () => {
      storageClassesPage.mockGetStorageClasses();
      storageClassesPage.visit();

      storageClassesTable.findRowByName('Test SC 1').should('be.visible');
      storageClassesTable.shouldContainAccessModeLabels(['RWX']); // display labels other than ROX label

      storageClassesTable.findRowByName('openshift-default-sc').should('be.visible');
      storageClassesTable.shouldContainAccessModeLabels([]); // empty because we do not display ROX label
    });

    it('table rows allow for toggling of Enable and Default values', () => {
      storageClassesPage.mockGetStorageClasses();
      storageClassesPage.visit();

      const openshiftDefaultTableRow =
        storageClassesTable.getRowByConfigName('openshift-default-sc');
      openshiftDefaultTableRow.findOpenshiftDefaultLabel().should('be.visible');
      openshiftDefaultTableRow.findEnableSwitchInput().should('have.attr', 'aria-checked', 'true');
      openshiftDefaultTableRow.findEnableSwitchInput().should('have.attr', 'disabled');
      openshiftDefaultTableRow.findDefaultRadioInput().should('have.attr', 'checked');
      openshiftDefaultTableRow.findDefaultRadioInput().should('not.have.attr', 'disabled');

      const otherStorageClassTableRow = storageClassesTable.getRowByConfigName('Test SC 1');
      otherStorageClassTableRow.findOpenshiftDefaultLabel().should('not.exist');
      otherStorageClassTableRow
        .findEnableSwitchInput()
        .should('have.attr', 'aria-checked', 'false');
      otherStorageClassTableRow.findEnableSwitchInput().should('not.have.attr', 'disabled');
      otherStorageClassTableRow.findDefaultRadioInput().should('not.have.attr', 'checked');
      otherStorageClassTableRow.findDefaultRadioInput().should('have.attr', 'disabled');

      storageClassesTable.mockGetStorageClass(otherStorageClass);
      storageClassesTable.mockPatchStorageClass(otherStorageClass).as('updateStorageClass-1');

      storageClassesPage
        .mockGetStorageClasses(
          [
            openshiftDefaultStorageClass,
            buildMockStorageClass(otherStorageClass, { isEnabled: true }),
          ],
          1,
        )
        .as('refreshStorageClasses-1');

      // Enable the other storage class so that the RHOAI default can be toggled
      otherStorageClassTableRow.findEnableSwitchInput().click({ force: true });
      cy.wait('@updateStorageClass-1');
      cy.wait('@refreshStorageClasses-1');

      otherStorageClassTableRow.findEnableSwitchInput().should('have.attr', 'aria-checked', 'true');
      otherStorageClassTableRow.findDefaultRadioInput().should('not.have.attr', 'disabled');

      storageClassesTable.mockGetStorageClass(otherStorageClass);
      storageClassesTable.mockPatchStorageClass(otherStorageClass).as('updateStorageClass-2');

      storageClassesTable.mockGetStorageClass(openshiftDefaultStorageClass);
      storageClassesTable
        .mockPatchStorageClass(openshiftDefaultStorageClass)
        .as('updateStorageClass-3');

      storageClassesPage
        .mockGetStorageClasses(
          [
            buildMockStorageClass(openshiftDefaultStorageClass, { isDefault: false }),
            buildMockStorageClass(otherStorageClass, { isEnabled: true, isDefault: true }),
          ],
          1,
        )
        .as('refreshStorageClasses-2');

      // Set the other storage class as the RHOAI default
      otherStorageClassTableRow.findDefaultRadioInput().click();
      cy.wait('@updateStorageClass-2');
      cy.wait('@updateStorageClass-3');
      cy.wait('@refreshStorageClasses-2');

      openshiftDefaultTableRow.findEnableSwitchInput().should('not.have.attr', 'disabled');
      openshiftDefaultTableRow.findDefaultRadioInput().should('have.attr', 'checked');
    });

    it('can edit storage class display name and description', () => {
      storageClassesPage.mockGetStorageClasses();
      storageClassesPage.visit();

      storageClassesTable
        .getRowByConfigName('openshift-default-sc')
        .findKebabAction('Edit')
        .click();
      storageClassEditModal.findOpenshiftDefaultLabel().should('be.visible');
      storageClassEditModal.findCloseButton().click();

      storageClassesTable.getRowByConfigName('Test SC 1').findKebabAction('Edit').click();
      storageClassEditModal.findOpenshiftScName().should('have.text', 'test-storage-class-1');
      storageClassEditModal.findProvisioner().should('have.text', 'kubernetes.io/glusterfs');
      storageClassEditModal.findOpenshiftDefaultLabel().should('not.exist');
      storageClassEditModal.fillDisplayNameInput('Updated name');
      storageClassEditModal.fillDescriptionInput('Updated description');

      storageClassEditModal.mockGetStorageClass(otherStorageClass);
      storageClassEditModal.mockPatchStorageClass(otherStorageClass);

      storageClassesPage
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
      const updatedRow = storageClassesTable.getRowByConfigName('Updated name');
      updatedRow.find().should('contain.text', 'Updated name');
      updatedRow.find().should('contain.text', 'Updated description');
    });

    it('can reset an unreadable storage class config', () => {
      const storageClassName = 'unreadable-config';
      const storageClass = {
        ...otherStorageClass,
        metadata: { ...otherStorageClass.metadata, name: storageClassName },
      };
      const unreadableConfigStorageClass = buildMockStorageClass(storageClass, '{“FAIL:}');

      storageClassesPage.mockGetStorageClasses([unreadableConfigStorageClass]);
      storageClassesPage.visit();

      const storageClassTableRow = storageClassesTable.getRowByName(storageClassName);
      storageClassTableRow.findDisplayNameValue().should('have.text', '-');
      storageClassTableRow.findEnableValue().should('have.text', '-');
      storageClassTableRow.findDefaultValue().should('have.text', '-');
      storageClassTableRow.findLastModifiedValue().should('have.text', '-');
      storageClassTableRow.findEnableValue().should('have.text', '-');
      storageClassTableRow.find().findByTestId('corrupted-metadata-alert').should('be.visible');
      storageClassTableRow.findKebabAction('Edit').click();
      storageClassEditModal.findInfoAlert().should('contain.text', 'Reset the metadata');
      storageClassEditModal.fillDisplayNameInput('Readable config');

      storageClassEditModal.mockGetStorageClass(storageClass);
      storageClassEditModal.mockPatchStorageClass(storageClass).as('patchStorageClass');

      storageClassesPage
        .mockGetStorageClasses([
          buildMockStorageClass(storageClass, {
            displayName: 'Readable config',
            isEnabled: false,
            isDefault: false,
            accessModeSettings: { ReadWriteOnce: true },
          }),
        ])
        .as('updateStorageClass');
      storageClassEditModal.findSaveButton().click();

      cy.wait('@patchStorageClass');
      cy.wait('@updateStorageClass');

      storageClassTableRow.findDisplayNameValue().should('have.text', 'Readable config');
      storageClassTableRow.findEnableSwitchInput().should('have.attr', 'aria-checked', 'false');
      storageClassTableRow.findDefaultRadioInput().should('not.have.attr', 'checked');
      storageClassTableRow.findLastModifiedValue().should('not.have.text', '-');
    });

    it('can reset individual config non-name fields when invalid', () => {
      const storageClassName = 'invalid-non-name-fields';
      const storageClassConfig =
        '{"isDefault":"","isEnabled":"","displayName":"Test malformed default, enable, lastmodified","lastModified":"","description":""}';
      const storageClass = buildMockStorageClass(
        { ...otherStorageClass, metadata: { name: storageClassName } },
        storageClassConfig,
      );
      const existingConfig = JSON.parse(storageClassConfig);

      storageClassesPage.mockGetStorageClasses([storageClass]);
      storageClassesPage.visit();

      const storageClassTableRow = storageClassesTable.getRowByName(storageClassName);
      storageClassTableRow
        .findEnableValue()
        .findByTestId('corrupted-metadata-alert')
        .should('be.visible');
      storageClassTableRow
        .findDefaultValue()
        .findByTestId('corrupted-metadata-alert')
        .should('be.visible');
      storageClassTableRow
        .findLastModifiedValue()
        .findByTestId('corrupted-metadata-alert')
        .should('be.visible');

      // Reset enable
      storageClassesTable.mockGetStorageClass(storageClass);
      storageClassesTable.mockPatchStorageClass(storageClass);

      storageClassesPage
        .mockGetStorageClasses([
          buildMockStorageClass(storageClass, {
            ...existingConfig,
            isEnabled: false,
          }),
        ])
        .as('resetEnable');

      storageClassTableRow
        .findEnableValue()
        .findByTestId('corrupted-metadata-alert-action')
        .click();

      cy.wait('@resetEnable');
      storageClassTableRow.findEnableSwitchInput().should('have.attr', 'aria-checked', 'false');

      // Reset default
      storageClassesTable.mockGetStorageClass(storageClass);
      storageClassesTable.mockPatchStorageClass(storageClass).as('patchStorageClass');

      storageClassesPage
        .mockGetStorageClasses([
          buildMockStorageClass(storageClass, {
            ...existingConfig,
            isEnabled: false,
            isDefault: false,
          }),
        ])
        .as('resetDefault');

      storageClassTableRow
        .findDefaultValue()
        .findByTestId('corrupted-metadata-alert-action')
        .click();

      cy.wait('@patchStorageClass');
      cy.wait('@resetDefault');
      storageClassTableRow.findDefaultRadioInput().should('not.have.attr', 'checked');

      // Reset last modified
      storageClassesTable.mockGetStorageClass(storageClass);
      storageClassesTable.mockPatchStorageClass(storageClass).as('patchStorageClass');

      storageClassesPage
        .mockGetStorageClasses([
          buildMockStorageClass(storageClass, {
            ...existingConfig,
            lastModified: '2023-08-22T15:42:53.101Z',
            isEnabled: false,
            isDefault: false,
          }),
        ])
        .as('resetLastModified');

      storageClassTableRow
        .findLastModifiedValue()
        .findByTestId('corrupted-metadata-alert-action')
        .click();

      cy.wait('@patchStorageClass');
      cy.wait('@resetLastModified');
      storageClassTableRow.findLastModifiedValue().should('contain.text', '8/22/2023');
    });

    it('can reset invalid config display name', () => {
      const storageClass = buildMockStorageClass(
        { ...otherStorageClass, metadata: { name: 'invalid-name' } },
        '{"isDefault":false,"isEnabled":false,"displayName":{},"lastModified":"2024-09-09T17:45:05.299Z","description":"Test malformed displayName"}',
      );

      storageClassesPage.mockGetStorageClasses([storageClass]);
      storageClassesPage.visit();

      const storageClassTableRow = storageClassesTable.getRowByName('invalid-name');
      storageClassTableRow
        .findDisplayNameValue()
        .findByTestId('corrupted-metadata-alert-action')
        .click();
      storageClassEditModal.findDisplayNameInput().should('be.empty');
      storageClassEditModal
        .findDescriptionInput()
        .should('have.value', 'Test malformed displayName');
      storageClassEditModal.findInfoAlert().should('contain.text', 'Edit the invalid field');
      storageClassEditModal.fillDisplayNameInput('New name');

      storageClassEditModal.mockGetStorageClass(storageClass);
      storageClassEditModal.mockPatchStorageClass(storageClass).as('patchStorageClass');

      storageClassesPage
        .mockGetStorageClasses([
          buildMockStorageClass(
            storageClass,
            buildMockStorageClassConfig(storageClass, {
              displayName: 'New name',
            }),
          ),
        ])
        .as('refreshStorageClasses');

      storageClassEditModal.findSaveButton().click();

      cy.wait('@patchStorageClass');
      cy.wait('@refreshStorageClasses');
      storageClassTableRow.findDisplayNameValue().should('contain.text', 'New name');
    });

    it('can reset invalid config description', () => {
      const storageClass = buildMockStorageClass(
        { ...otherStorageClass, metadata: { name: 'invalid-description' } },
        '{"isDefault":false,"isEnabled":false,"displayName":"Test malformed description","lastModified":"2024-09-09T17:45:05.299Z","description":{}}',
      );

      storageClassesPage.mockGetStorageClasses([storageClass]);
      storageClassesPage.visit();

      const storageClassTableRow = storageClassesTable.getRowByName('invalid-description');
      storageClassTableRow
        .findDisplayNameValue()
        .findByTestId('corrupted-metadata-alert-action')
        .click();
      storageClassEditModal
        .findDisplayNameInput()
        .should('have.value', 'Test malformed description');
      storageClassEditModal.findDescriptionInput().should('be.empty');
      storageClassEditModal.findInfoAlert().should('contain.text', 'Edit the invalid field');

      storageClassEditModal.mockGetStorageClass(storageClass);
      storageClassEditModal.mockPatchStorageClass(storageClass).as('patchStorageClass');

      storageClassesPage
        .mockGetStorageClasses([
          buildMockStorageClass(
            storageClass,
            buildMockStorageClassConfig(storageClass, {
              description: '',
            }),
          ),
        ])
        .as('refreshStorageClasses');

      storageClassEditModal.findSaveButton().click();

      cy.wait('@patchStorageClass');
      cy.wait('@refreshStorageClasses');
      storageClassTableRow.findDisplayNameValue().should('have.text', 'Test malformed description');
    });

    it('can reset invalid config display name & description', () => {
      const storageClass = buildMockStorageClass(
        { ...otherStorageClass, metadata: { name: 'invalid-name-and-desc' } },
        '{"isDefault":false,"isEnabled":false,"displayName":{},"description":{},"lastModified":"2024-09-09T17:45:05.299Z"}',
      );

      storageClassesPage.mockGetStorageClasses([storageClass]);
      storageClassesPage.visit();

      const storageClassTableRow = storageClassesTable.getRowByName('invalid-name-and-desc');
      storageClassTableRow
        .findDisplayNameValue()
        .findByTestId('corrupted-metadata-alert-action')
        .click();
      storageClassEditModal.findDisplayNameInput().should('be.empty');
      storageClassEditModal.findDescriptionInput().should('be.empty');
      storageClassEditModal.findInfoAlert().should('contain.text', 'Edit the invalid field');
      storageClassEditModal.fillDisplayNameInput('New name');
      storageClassEditModal.fillDescriptionInput('New description');

      storageClassEditModal.mockGetStorageClass(storageClass);
      storageClassEditModal.mockPatchStorageClass(storageClass).as('patchStorageClass');

      storageClassesPage
        .mockGetStorageClasses([
          buildMockStorageClass(
            storageClass,
            buildMockStorageClassConfig(storageClass, {
              displayName: 'New name',
              description: 'New description',
            }),
          ),
        ])
        .as('refreshStorageClasses');

      storageClassEditModal.findSaveButton().click();

      cy.wait('@patchStorageClass');
      cy.wait('@refreshStorageClasses');
      storageClassTableRow.findDisplayNameValue().should('contain.text', 'New name');
      storageClassTableRow.findDisplayNameValue().should('contain.text', 'New description');
    });

    it('can filter table by displayName and/or OpenShift storage class name', () => {
      const storageClasses = [
        ...mockStorageClasses,
        buildMockStorageClass(
          {
            ...mockStorageClasses[0],
            metadata: { ...mockStorageClasses[0].metadata, name: 'sc-2' },
          },
          { displayName: 'Test SC 2' },
        ),
      ];

      storageClassesPage.mockGetStorageClasses(storageClasses);
      storageClassesPage.visit();
      storageClassesTable.findRows().should('have.length', 3);

      // Filter only by display name
      const toolbar = storageClassesTable.getTableToolbar();
      toolbar.fillSearchInput('Test');
      storageClassesTable.findRows().should('have.length', 2);
      toolbar.findSearchInput().clear();
      storageClassesTable.findRows().should('have.length', 3);

      // Filter only by OpenShift class
      toolbar.findFilterMenuItem('OpenShift storage class').click();
      toolbar.fillSearchInput('sc-2');
      storageClassesTable.findRows().should('have.length', 1);
      toolbar.findSearchInput().clear();
      storageClassesTable.findRows().should('have.length', 3);

      // Filter by a value that doesn't exist in any row
      toolbar.fillSearchInput('not found');
      storageClassesTable.findEmptyState().should('be.visible');
      storageClassesTable.findClearFiltersButton().click();
      storageClassesTable.findRows().should('have.length', 3);
      toolbar.findSearchInput().clear();

      // Filter by both display name and OpenShift class
      toolbar.fillSearchInput('test');
      toolbar.findFilterMenuItem('Display name').click();
      toolbar.fillSearchInput('test');
      storageClassesTable.findRows().should('have.length', 1);
    });

    it('should not show no default alert when there is an OpenShift default storage class', () => {
      storageClassesPage.mockGetStorageClasses([openshiftDefaultStorageClass]);
      storageClassesTable.mockGetStorageClass(openshiftDefaultStorageClass);
      storageClassesTable.mockPatchStorageClass(openshiftDefaultStorageClass);
      storageClassesPage.visit();

      storageClassesPage.findNoDefaultAlert().should('not.exist');
    });

    it('should show no default alert when there is no OpenShift default storage classes', () => {
      storageClassesPage.mockGetStorageClasses([otherStorageClass]);
      storageClassesTable.mockGetStorageClass(otherStorageClass);
      storageClassesTable.mockPatchStorageClass(otherStorageClass);
      storageClassesPage.visit();

      storageClassesPage.findNoDefaultAlert().should('exist');
    });

    it('should show access mode checkboxes with correct enable/disable and checked/unchecked states', () => {
      const config = {
        accessModeSettings: {
          [AccessMode.RWO]: true,
          [AccessMode.RWX]: false,
          //ROX missing
          [AccessMode.RWOP]: true,
        },
      };
      const storageClass = buildMockStorageClass(otherStorageClass, config);
      storageClassesPage.mockGetStorageClasses([storageClass]);
      storageClassesPage.visit();
      storageClassesTable.getRowByConfigName('Test SC 1').findKebabAction('Edit').click();

      storageClassEditModal.findAccessModeCheckbox('rwo').should('be.disabled').and('be.checked');

      storageClassEditModal
        .findAccessModeCheckbox('rwx')
        .should('be.enabled')
        .and('not.be.checked')
        .click()
        .should('be.checked');

      storageClassEditModal
        .findAccessModeCheckbox('rox')
        .should('be.disabled')
        .and('not.be.checked');

      storageClassEditModal
        .findAccessModeCheckbox('rwop')
        .should('be.enabled')
        .and('be.checked')
        .click()
        .and('not.be.checked');
    });

    it('should update accessModeSettings and persist changes on save', () => {
      const oldConfig = {
        accessModeSettings: {
          [AccessMode.RWO]: true,
          [AccessMode.RWX]: true,
          [AccessMode.RWOP]: false,
        },
      };

      const newConfig = {
        accessModeSettings: {
          [AccessMode.RWO]: true,
          [AccessMode.RWX]: false,
          [AccessMode.RWOP]: true,
        },
      };

      const storageClass = buildMockStorageClass(otherStorageClass, oldConfig);

      storageClassesPage.mockGetStorageClasses([storageClass]);
      storageClassesPage.visit();
      storageClassesTable.getRowByConfigName('Test SC 1').findKebabAction('Edit').click();

      storageClassEditModal.findAccessModeCheckbox('rwx').click().should('not.be.checked');
      storageClassEditModal.findAccessModeCheckbox('rwop').click().should('be.checked');

      const newStorageClass = buildMockStorageClass(otherStorageClass, newConfig);

      storageClassEditModal.mockGetStorageClass(newStorageClass);
      storageClassEditModal.mockPatchStorageClass(newStorageClass).as('patchStorageClass');
      storageClassesPage.mockGetStorageClasses([newStorageClass]).as('refreshStorageClass');

      storageClassEditModal.findSaveButton().click();
      cy.wait('@patchStorageClass');
      cy.wait('@refreshStorageClass');

      storageClassesTable.getRowByConfigName('Test SC 1').findKebabAction('Edit').click();
      storageClassEditModal.findAccessModeCheckbox('rwo').should('be.checked');
      storageClassEditModal.findAccessModeCheckbox('rwx').should('not.be.checked');
      storageClassEditModal
        .findAccessModeCheckbox('rox')
        .should('be.disabled')
        .and('not.be.checked');
      storageClassEditModal.findAccessModeCheckbox('rwop').should('be.checked');
    });

    it('should show the alert when RWX is disabled', () => {
      const config = {
        accessModeSettings: {
          ReadWriteOnce: true,
          ReadWriteMany: true,
        },
      };
      const storageClass = buildMockStorageClass(otherStorageClass, config);
      storageClassesPage.mockGetStorageClasses([storageClass]);
      storageClassesPage.visit();
      storageClassesTable.getRowByConfigName('Test SC 1').findKebabAction('Edit').click();

      storageClassEditModal.findAccessModeCheckbox('rwx').click().should('not.be.checked');
      storageClassEditModal.findAccessModeAlert().should('be.visible');
      storageClassEditModal
        .findAccessModeAlert()
        .should('contain.text', 'Disabling the RWX access mode will prevent new storage');
    });
  });
});
