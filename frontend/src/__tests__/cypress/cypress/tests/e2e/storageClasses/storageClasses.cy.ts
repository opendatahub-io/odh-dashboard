import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import {
  createStorageClass,
  deleteStorageClass,
} from '~/__tests__/cypress/cypress/utils/oc_commands/storageClass';
import { TEST_USER, ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { pageNotfound } from '~/__tests__/cypress/cypress/pages/pageNotFound';
import {
  verifyStorageClassConfig,
  provisionStorageClassFeature,
  tearDownStorageClassFeature,
} from '~/__tests__/cypress/cypress/utils/storageClass';
import {
  storageClassEditModal,
  storageClassesPage,
  storageClassesTable,
} from '~/__tests__/cypress/cypress/pages/storageClasses';
import type { SCReplacements } from '~/__tests__/cypress/cypress/types';

const projectName = 'test-settings-storage-classes-dsp';
const scName = 'qe-settings-sc';
const scDefaultName = 'standard-csi';

// Using testIsolation will reuse the login (cache)
// describe('An admin user can manage Storage Classes', { testIsolation: false }, () => {
describe('An admin user can manage Storage Classes from Settings -> Storage classes view', () => {
  let createdStorageClasses: string[];
  before(() => {
    // Provision different SCs
    createdStorageClasses = provisionStorageClassFeature(scName);
  });

  after(() => {
    // Delete provisioned SCs
    tearDownStorageClassFeature(createdStorageClasses);
  });

  it.skip('A non admin user can not acccess to Settings -> Storage classes view', () => {
    // Login as a regular user and try to land in storage classes view
    cy.visitWithLogin('/storageClasses', TEST_USER);
    pageNotfound.findPage().should('be.visible');
  });

  it.skip('The Default label is present in the grid', () => {
    cy.visitWithLogin('/', ADMIN_USER);
    storageClassesPage.navigate();
    const scDisabledRow = storageClassesTable.getRowByConfigName(scDefaultName);
    // There's the Default label
    scDisabledRow.findOpenshiftDefaultLabel().should('exist');
  });

  it.skip('An admin user can enable a disabled Storage Class', () => {
    cy.visitWithLogin('/', ADMIN_USER);
    storageClassesPage.navigate();
    const scDisabledName = scName + '-disabled-non-default';
    // SC row exist
    storageClassesTable.findRowByName(scDisabledName).should('be.visible');
    const scDisabledRow = storageClassesTable.getRowByConfigName(scDisabledName);
    // There's no Default label
    scDisabledRow.findOpenshiftDefaultLabel().should('not.exist');
    // The Enable switch is set to disabled
    scDisabledRow.findEnableSwitchInput().should('have.attr', 'aria-checked', 'false');
    // The Default radio button is disabled
    scDisabledRow.findDefaultRadioInput().should('be.disabled');

    // Enable the SC
    scDisabledRow.findEnableSwitchInput().click({ force: true });

    // The Enable switch is set to enabled
    scDisabledRow.findEnableSwitchInput().should('have.attr', 'aria-checked', 'true');
    // The Default radio button is enabled but not checked
    scDisabledRow.findDefaultRadioInput().should('be.enabled');
    scDisabledRow.findDefaultRadioInput().should('not.have.attr', 'checked');
    verifyStorageClassConfig(scDisabledName, false, true);
  });

  it.skip('An admin user can disable an enabled Storage Class', () => {
    cy.visitWithLogin('/', ADMIN_USER);
    storageClassesPage.navigate();
    const scEnabledName = scName + '-enabled-non-default';
    // SC row exist
    storageClassesTable.findRowByName(scEnabledName).should('be.visible');
    const scEnabledRow = storageClassesTable.getRowByConfigName(scEnabledName);
    // There's no Default label
    scEnabledRow.findOpenshiftDefaultLabel().should('not.exist');
    // The Enable switch is set to enabled
    scEnabledRow.findEnableSwitchInput().should('have.attr', 'aria-checked', 'true');
    // The Default radio button is enabled but not checked
    scEnabledRow.findDefaultRadioInput().should('be.enabled');
    scEnabledRow.findDefaultRadioInput().should('not.have.attr', 'checked');

    // Enable the SC
    scEnabledRow.findEnableSwitchInput().click({ force: true });

    // The Enable switch is set to disabled
    scEnabledRow.findEnableSwitchInput().should('have.attr', 'aria-checked', 'false');
    // The Default radio button is disabled
    scEnabledRow.findDefaultRadioInput().should('be.disabled');
    verifyStorageClassConfig(scEnabledName, false, false);
  });

  it.skip('An admin user can set an enabled Storage Class as the default one', () => {
    cy.visitWithLogin('/', ADMIN_USER);
    storageClassesPage.navigate();
    const scToDefaultName = scName + '-enabled-to-default';
    const scToDefaultRow = storageClassesTable.getRowByConfigName(scToDefaultName);
    // There's no Default label
    scToDefaultRow.findOpenshiftDefaultLabel().should('not.exist');
    // The Default radio button is enabled but not checked
    scToDefaultRow.findDefaultRadioInput().should('be.enabled');
    scToDefaultRow.findDefaultRadioInput().should('not.have.attr', 'checked');

    // Set the SC to be the default one
    scToDefaultRow.findDefaultRadioInput().click();

    // The Default radio button is enabled
    scToDefaultRow.findDefaultRadioInput().should('be.enabled');
    // The Enable switch is disabled
    scToDefaultRow.findEnableSwitchInput().should('be.disabled');
    verifyStorageClassConfig(scToDefaultName, true, true);
  });

  it('An admin user can edit an Storage Class', () => {
    cy.visitWithLogin('/', ADMIN_USER);
    storageClassesPage.navigate();
    const scEnabledName = scName + '-enabled-non-default';
    storageClassesTable.getRowByConfigName(scEnabledName).findKebabAction('Edit').click();
    // Edit DisplayName and Description
    const scNameEdited = scName + '-edited';
    const scEditedDescription = 'Edited Description';
    storageClassEditModal.fillDisplayNameInput(scNameEdited);
    storageClassEditModal.fillDescriptionInput(scEditedDescription);
    storageClassEditModal.findSaveButton().click();
    // Verify new values
    const scEditedRow = storageClassesTable.getRowByConfigName(scNameEdited);
    scEditedRow.find().should('contain.text', scNameEdited);
    scEditedRow.find().should('contain.text', scEditedDescription);
    verifyStorageClassConfig(
      scEnabledName,
      undefined,
      undefined,
      scNameEdited,
      scEditedDescription,
    );
  });
});
