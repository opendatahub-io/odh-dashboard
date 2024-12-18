import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  verifyStorageClassConfig,
  provisionStorageClassFeature,
  tearDownStorageClassFeature,
} from '~/__tests__/cypress/cypress/utils/storageClass';
import {
  storageClassesPage,
  storageClassesTable,
} from '~/__tests__/cypress/cypress/pages/storageClasses';

const scName = 'qe-settings-sc';

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

  it('An admin user can enable a disabled Storage Class', () => {
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    storageClassesPage.navigate();
    const scDisabledName = `${scName}-disabled-non-default`;
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

  it('An admin user can disable an enabled Storage Class', () => {
    cy.step('Navigate to Storage Classes view');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    storageClassesPage.navigate();

    const scEnabledName = `${scName}-enabled-non-default`;

    cy.step('Check SC row exist');
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
  });

  it('An admin user can set an enabled Storage Class as the default one', () => {
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
  });
});
