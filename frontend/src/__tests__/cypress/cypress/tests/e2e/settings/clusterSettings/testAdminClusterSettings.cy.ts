import yaml from 'js-yaml';
import { ADMIN_USER, TEST_USER, KUBE_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  clusterSettings,
  cullerSettings,
  notebookTolerationSettings,
  pvcSizeSettings,
  telemetrySettings,
  modelServingSettings,
} from '~/__tests__/cypress/cypress/pages/clusterSettings';
import { pageNotfound } from '~/__tests__/cypress/cypress/pages/pageNotFound';
import type { SettingsTestData } from '~/__tests__/cypress/cypress/types';

describe('Verify that only the Cluster Admin can access Cluster Settings', () => {
  let testData: SettingsTestData;

  // Setup: Load test data and ensure clean state
  before(() => {
    return cy
      .fixture('e2e/settings/clusterSettings/clusterSettings.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as SettingsTestData;
      });
  });

  it('Admin - Access Cluster Settings and validate fields', () => {
    // Authentication and navigation
    cy.step('Log into the application');
    cy.visitWithLogin('/', ADMIN_USER);

    cy.step('Navigate to Cluster Settings');
    clusterSettings.visit();

    // Verify Cluster Settings UI Fields
    cy.step('Validate Model Serving Platforms display and are checked');
    modelServingSettings.findSinglePlatformCheckbox().should('be.checked');
    modelServingSettings.findMultiPlatformCheckbox().should('be.checked');

    cy.step('Validate PVC Size displays and 20GiB default displays');
    pvcSizeSettings
      .findInput()
      .should('exist')
      .and('be.visible')
      .and('have.value', testData.pvcDefaultSize);

    cy.step('Validate Stop idle notebooks displays and fields are enabled/disabled');
    cullerSettings.findStopIdleNotebooks().should('exist');
    cullerSettings.findLimitedOption().click();
    cullerSettings.findSubmitButton().should('be.enabled');
    cullerSettings.findUnlimitedOption().click();
    cullerSettings.findSubmitButton().should('be.disabled');

    cy.step('Validate Usage data collection displays');
    telemetrySettings.findUsageDataCollectionText().should('exist');

    cy.step('Validate Notebook pod tolerations displays and fields are enabled/disabled');
    notebookTolerationSettings.findNotebookPodTolerationsText().should('exist');
  });
  it('Test User - should not have access rights to view the Cluster Settings tab', () => {
    // Authentication and attempt to navigate to Cluster Settings
    cy.step('Log into the application');
    cy.visitWithLogin('/', TEST_USER);

    cy.step('Navigate to the Cluster Settings');
    clusterSettings.visit(false);
    pageNotfound.findPage().should('exist');
    clusterSettings.findNavItem().should('not.exist');
  });
  it('Kube Admin User - should not have access rights to view the Cluster Settings tab', () => {
    // Authentication and attempt to navigate to Cluster Settings
    cy.step('Log into the application');
    cy.visitWithLogin('/', KUBE_ADMIN_USER);

    cy.step('Navigate to the Cluster Settings');
    clusterSettings.visit(false);
    pageNotfound.findPage().should('exist');
    clusterSettings.findNavItem().should('not.exist');
  });
});
