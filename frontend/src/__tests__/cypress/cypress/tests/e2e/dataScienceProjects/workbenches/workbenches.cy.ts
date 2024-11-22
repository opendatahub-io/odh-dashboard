import type { DataScienceProjectData, PVCReplacements } from '~/__tests__/cypress/cypress/types';
import { projectDetails, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import { permissions } from '~/__tests__/cypress/cypress/pages/permissions';
import { workbenchPage, createSpawnerPage } from '~/__tests__/cypress/cypress/pages/workbench';
import { clusterStorage } from '~/__tests__/cypress/cypress/pages/clusterStorage';
import {
  HTPASSWD_CLUSTER_ADMIN_USER,
  LDAP_CONTRIBUTOR_USER,
} from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadPVCFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { createPersistentVolumeClaim } from '~/__tests__/cypress/cypress/utils/oc_commands/presistentVolumeClaim';

describe('Workbench and PVSs tests', () => {
  // let testData: PVCReplacements;
  let projectName: string;
  let PVCName: string;
  let PVCDisplayName: string;

  before(() => {
    return loadPVCFixture('e2e/dataScienceProjects/testProjectWbPV.yaml')
      .then((fixtureData: PVCReplacements) => {
        // testData = fixtureData;
        projectName = fixtureData.NAMESPACE;
        PVCName = fixtureData.PVC_NAME;
        PVCDisplayName = fixtureData.PVC_DISPLAY_NAME;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        return createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Project ${projectName} confirmed to be created and verified successfully`);
        const pvcReplacements: PVCReplacements = {
          NAMESPACE: projectName, // Assign projectName to NAMESPACE
          PVC_NAME: PVCName, // Assign the appropriate value to PVC_NAME
          PVC_DISPLAY_NAME: PVCDisplayName, // Assign the appropriate value to PVC_DISPLAY_NAME
        };
        return createPersistentVolumeClaim(pvcReplacements);
      })
      .then((commandResult) => {
        cy.log(`Persistent Volume Claim created: ${JSON.stringify(commandResult)}`);
      });
  });

  after(() => {
    // Delete provisioned Project
    if (projectName) {
      cy.log(`Deleting Project ${projectName} after the test has finished.`);
      deleteOpenShiftProject(projectName);
    }
  });

  it('Verify users can create a workbench and connect an existent PersistentVolume', () => {
    projectName = 'dsp-wb-test';
    PVCName = 'pvc-test-name';
    PVCDisplayName = 'pvc-test-display-name';

    const workbenchName = projectName.replace('dsp-', '');

    // Authentication and navigation
    cy.step('Log into the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

    cy.step(`Navigate to Workbenches tab of Project ${projectName}`);
    projectListPage.navigate();
    projectListPage.filterProjectByName(projectName);
    projectListPage.findProjectLink(projectName).click();
    projectDetails.findSectionTab('workbenches').click();

    cy.step(`Create Workbench ${projectName} using storage ${PVCDisplayName}`);
    workbenchPage.findCreateButton().click();
    createSpawnerPage.getNameInput().fill(workbenchName);
    createSpawnerPage.findNotebookImage('s2i-minimal-notebook').click();
    createSpawnerPage.findExsistingPersistentStorageRadio().click();
    createSpawnerPage.selectExistingPersistentStorage(PVCDisplayName);
    createSpawnerPage.findSubmitButton().click();

    cy.step(`Wait Workbench ${workbenchName} to have "Running" status`);
    const notebookRow = workbenchPage.getNotebookRow(workbenchName);
    notebookRow.expectStatusLabelToBe('Running', 120000);
    notebookRow.shouldHaveNotebookImageName('Minimal Python');
    notebookRow.shouldHaveContainerSize('Small');

    cy.step(`Check the cluster storage ${PVCDisplayName} is now connected to ${workbenchName}`);
    projectDetails.findSectionTab('cluster-storages').click();
    const csRow = clusterStorage.getClusterStorageRow(PVCDisplayName);
    csRow.findConnectedWorkbenches().should('have.text', workbenchName);
  });
});
