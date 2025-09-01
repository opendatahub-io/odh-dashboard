import {
  AccessMode,
  StorageProvisioner,
} from '@odh-dashboard/internal/pages/storageClasses/storageEnums';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  verifyStorageClassConfig,
  provisionStorageClassFeature,
  tearDownStorageClassFeature,
  provisionStorageClass,
} from '#~/__tests__/cypress/cypress/utils/storageClass';
import {
  storageClassesPage,
  storageClassesTable,
  storageClassEditModal,
} from '#~/__tests__/cypress/cypress/pages/storageClasses';
import {
  retryableBefore,
  wasSetupPerformed,
} from '#~/__tests__/cypress/cypress/utils/retryableHooks';

const scName = 'qe-settings-sc';
const scAccessModeName1 = `${scName}-manila-csi`;
const scAccessModeName2 = `${scName}-vsphere-volume`;

// Using testIsolation will reuse the login (cache)
// describe('An admin user can manage Storage Classes', { testIsolation: false }, () => {
describe('An admin user can manage Storage Classes from Settings -> Storage classes view', () => {
  let createdStorageClasses: string[];
  let accessModeStorageClasses: string[];
  retryableBefore(() => {
    // Provision different SCs
    createdStorageClasses = provisionStorageClassFeature(scName);
    accessModeStorageClasses = [
      provisionStorageClass(scAccessModeName1, StorageProvisioner.MANILA_CSI, {
        ReadWriteOnce: true,
        ReadWriteMany: false,
        ReadWriteOncePod: false,
        ReadOnlyMany: false,
      }),
      provisionStorageClass(scAccessModeName2, StorageProvisioner.VSPHERE_VOLUME, {
        ReadWriteOnce: true,
        ReadWriteMany: true,
      }),
    ];
  });

  after(() => {
    //Check if the Before Method was executed to perform the setup
    if (!wasSetupPerformed()) {
      return;
    }

    // Delete provisioned SCs
    tearDownStorageClassFeature(createdStorageClasses);
    tearDownStorageClassFeature(accessModeStorageClasses);
  });

  it(
    'An admin user can enable a disabled Storage Class',
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@NonConcurrent'] },
    () => {
      cy.step('Navigate to Storage Classes view');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      storageClassesPage.navigate();
      const scDisabledName = `${scName}-disabled-non-default`;
      cy.step('Check SC row exists');
      // SC row exist
      storageClassesTable.findRowByName(scDisabledName).should('be.visible');
      const scDisabledRow = storageClassesTable.getRowByConfigName(scDisabledName);
      cy.step("Check there's no Default label");
      // There's no Default label
      scDisabledRow.findOpenshiftDefaultLabel().should('not.exist');
      cy.step('Check the Enable switch is set to disabled');
      // The Enable switch is set to disabled
      scDisabledRow.findEnableSwitchInput().should('have.attr', 'aria-checked', 'false');
      cy.step('Check the Default radio button is disabled');
      // The Default radio button is disabled
      scDisabledRow.findDefaultRadioInput().should('be.disabled');

      cy.step('Enable the Storage Class');
      // Enable the SC
      scDisabledRow.findEnableSwitchInput().click({ force: true });

      cy.step('Check the Enable switch is set to Enabled');
      // The Enable switch is set to enabled
      scDisabledRow.findEnableSwitchInput().should('have.attr', 'aria-checked', 'true');
      cy.step('Check the Default radio button is disabled');
      // The Default radio button is enabled but not checked
      scDisabledRow.findDefaultRadioInput().should('be.enabled');
      scDisabledRow.findDefaultRadioInput().should('not.have.attr', 'checked');
      verifyStorageClassConfig(scDisabledName, false, true);
    },
  );

  it(
    'An admin user can disable an enabled Storage Class',
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@NonConcurrent'] },
    () => {
      cy.step('Navigate to Storage Classes view');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      storageClassesPage.navigate();

      const scEnabledName = `${scName}-enabled-non-default`;

      cy.step('Check SC row exists');
      storageClassesTable.findRowByName(scEnabledName).should('be.visible');
      const scEnabledRow = storageClassesTable.getRowByConfigName(scEnabledName);
      cy.step("Check there's no Default label");
      scEnabledRow.findOpenshiftDefaultLabel().should('not.exist');
      cy.step('Check the Enable switch is set to enabled');
      scEnabledRow.findEnableSwitchInput().should('have.attr', 'aria-checked', 'true');
      cy.step('Check the Default radio button is enabled but not checked');
      scEnabledRow.findDefaultRadioInput().should('be.enabled');
      scEnabledRow.findDefaultRadioInput().should('not.have.attr', 'checked');

      cy.step('Enable the Storage Class');
      scEnabledRow.findEnableSwitchInput().click({ force: true });

      cy.step('Check the Enable switch is set to disabled');
      scEnabledRow.findEnableSwitchInput().should('have.attr', 'aria-checked', 'false');
      cy.step('Check the Default radio button is disabled');
      scEnabledRow.findDefaultRadioInput().should('be.disabled');
      verifyStorageClassConfig(scEnabledName, false, false);
    },
  );

  it(
    'An admin user can set an enabled Storage Class as the default one',
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@NonConcurrent'] },
    () => {
      cy.step('Navigate to Storage Classes view');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      storageClassesPage.navigate();

      const scToDefaultName = `${scName}-enabled-to-default`;
      const scToDefaultRow = storageClassesTable.getRowByConfigName(scToDefaultName);

      cy.step("Check there's no Default label");
      scToDefaultRow.findOpenshiftDefaultLabel().should('not.exist');
      cy.step('Check the Default radio button is enabled but not checked');
      scToDefaultRow.findDefaultRadioInput().should('be.enabled');
      scToDefaultRow.findDefaultRadioInput().should('not.have.attr', 'checked');

      cy.step('Set the SC to be the default one');
      scToDefaultRow.findDefaultRadioInput().click();

      cy.step('Check the Default radio button is enabled');
      scToDefaultRow.findDefaultRadioInput().should('be.enabled');
      cy.step('Check the Enable switch is disabled');
      scToDefaultRow.findEnableSwitchInput().should('be.disabled');
      verifyStorageClassConfig(scToDefaultName, true, true);
    },
  );

  it(
    'An admin user can edit the access mode of a storage class',
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@NonConcurrent'] },
    () => {
      cy.step('Navigate to Storage Classes view');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      storageClassesPage.navigate();

      const scAccessModeRow = storageClassesTable.getRowByConfigName(scAccessModeName1);

      cy.step('Check SC initial access modes');
      storageClassesTable.findRowByName(scAccessModeName1).should('be.visible');
      scAccessModeRow.shouldContainAccessModeLabels(['RWO']);

      cy.step('Navigate to edit SC');
      storageClassesTable.getRowByConfigName(scAccessModeName1).findKebabAction('Edit').click();

      cy.step('Check initial access mode checkboxes state');
      storageClassEditModal
        .findAccessModeCheckbox(AccessMode.RWO)
        .should('be.disabled')
        .and('be.checked');
      storageClassEditModal.findAccessModeCheckbox(AccessMode.RWX).should('not.be.checked');
      storageClassEditModal.findAccessModeCheckbox(AccessMode.ROX).should('not.be.checked');
      storageClassEditModal
        .findAccessModeCheckbox(AccessMode.RWOP)
        .should('be.disabled')
        .should('not.be.checked');

      cy.step('Change access modes - enable ReadWriteMany and ReadOnlyMany');
      storageClassEditModal.findAccessModeCheckbox(AccessMode.RWX).click();
      storageClassEditModal.findAccessModeCheckbox(AccessMode.ROX).click();

      cy.step('Verify the checkboxes are now checked');
      storageClassEditModal.findAccessModeCheckbox(AccessMode.RWX).should('be.checked');
      storageClassEditModal.findAccessModeCheckbox(AccessMode.ROX).should('be.checked');

      cy.step('Save the changes');
      storageClassEditModal.findSaveButton().click();
      cy.step('Verify that the correct access mode labels are displayed in the table');
      scAccessModeRow.shouldContainAccessModeLabels(['RWO', 'RWX', 'ROX']);
      cy.step('Verify that access modes are updated in the storage class CR');
      verifyStorageClassConfig(scAccessModeName1, false, true, undefined, undefined, {
        ReadWriteOnce: true,
        ReadWriteMany: true,
        ReadOnlyMany: true,
      });

      cy.step('Check that an alert shows up when unchecking RWX');
      storageClassesTable.getRowByConfigName(scAccessModeName1).findKebabAction('Edit').click();
      storageClassEditModal.findAccessModeCheckbox(AccessMode.RWX).click(); // uncheck
      storageClassEditModal.findAccessModeAlert().should('be.visible');
      storageClassEditModal.findAccessModeCheckbox(AccessMode.RWX).click(); // re-check
      storageClassEditModal.findAccessModeAlert().should('not.exist');

      cy.step('Check that an alert does not show up when unchecking access mode other than RWX');
      storageClassEditModal.findAccessModeCheckbox(AccessMode.ROX).click(); // uncheck
      storageClassEditModal.findAccessModeAlert().should('not.exist');
      storageClassEditModal.findAccessModeCheckbox(AccessMode.ROX).click(); // re-check
      storageClassEditModal.findAccessModeAlert().should('not.exist');
    },
  );
});
