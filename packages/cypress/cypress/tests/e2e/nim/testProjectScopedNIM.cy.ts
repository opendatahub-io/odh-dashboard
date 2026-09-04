import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { projectDetails, projectDetailsSettingsTab } from '../../../pages/projects';
import { modelServingGlobal, modelServingWizard } from '../../../pages/modelServing';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { retryableBefore } from '../../../utils/retryableHooks';
import { deleteOpenShiftProject, addUserToProject } from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import { waitForNIMAccountValidation } from '../../../utils/oc_commands/nimCommands';

const uuid = generateTestUUID();

let projectName: string;

describe('A user can enable project-scoped NIM', () => {
  retryableBefore(() => {
    projectName = `enable-project-scoped-nim-${uuid}`;

    cy.step('Create the project and grant the odh-admin test user access');
    createCleanProject(projectName)
      .then(() => addUserToProject(projectName, LDAP_ADMIN_USER.USERNAME, 'admin'))
      .then(() => {
        cy.log(`Created project ${projectName} and granted admin to the test user`);
      });
  });

  after(() => {
    // Deleting the project also removes the NIM account created during the test.
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Enable NIM from Settings, then deploy a NIM model from the Models tab',
    {
      tags: ['@Dashboard', '@ModelServing', '@NIM', '@NIMServingCI', '@Featureflagged'],
    },
    () => {
      cy.step('Log in as odh-admin and open the project Settings tab');
      cy.visitWithLogin(
        `/projects/${projectName}?section=settings&devFeatureFlags=nimWizard=true`,
        LDAP_ADMIN_USER,
      );

      cy.step('Verify the NIM settings card offers to add a personal API key');
      projectDetailsSettingsTab.findNIMEnableButton().should('be.visible').click();

      cy.step('Enter the NIM API key and submit');
      projectDetailsSettingsTab.findNIMApiKeyModal().should('be.visible');
      projectDetailsSettingsTab
        .findNIMApiKeyInput()
        .clear()
        .type(Cypress.env('NGC_API_KEY'), { log: false });
      projectDetailsSettingsTab.findNIMApiKeySubmitButton().should('be.enabled').click();

      cy.step('Wait for NIM account validation on the project namespace (up to 7 minutes)');
      waitForNIMAccountValidation(projectName);

      cy.step('Verify the key was validated and close the modal');
      projectDetailsSettingsTab.findNIMApiKeyCloseButton().should('be.visible').click();

      cy.step('Verify the card now shows the enabled management actions');
      projectDetailsSettingsTab.findNIMRemoveButton().should('exist');
      projectDetailsSettingsTab.findNIMReplaceKeyButton().should('exist');

      cy.step('Open the deployment wizard from the project Models tab');
      projectDetails.findModelServingTab().click();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Wait for the NIM image list to load and verify models are selectable');
      modelServingWizard.findModelLocationSelectOption('NVIDIA NIM').click();

      modelServingWizard.nim.findImageSelect().should('be.visible').click();
      modelServingWizard.nim.findImageSelectOptions().should('have.length.greaterThan', 0);
    },
  );
});
