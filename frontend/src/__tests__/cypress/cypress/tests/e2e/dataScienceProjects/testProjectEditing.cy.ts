import type { DataScienceProjectData } from '~/__tests__/cypress/cypress/types';
import {
  editProjectModal,
  projectDetails,
  projectListPage,
} from '~/__tests__/cypress/cypress/pages/projects';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadDSPFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import {
  retryableBefore,
  wasSetupPerformed,
} from '~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '~/__tests__/cypress/cypress/utils/uuidGenerator';

describe('Verify Data Science Project - Editing', () => {
  let testData: DataScienceProjectData;
  let projectName: string;
  const uuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() => {
    return loadDSPFixture('e2e/dataScienceProjects/testProjectEditing.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectEditResourceName}-${uuid}`;
        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        return createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Project ${projectName} confirmed to be created and verified successfully`);
      });
  });
  after(() => {
    //Check if the Before Method was executed to perform the setup
    if (!wasSetupPerformed()) return;

    // Delete provisioned Project
    if (projectName) {
      cy.log(`Deleting Project ${projectName} after the test has finished.`);
      deleteOpenShiftProject(projectName, { wait: false });
    }
  });

  it(
    'Edit a Data Science Project in RHOAI',
    { tags: ['@Smoke', '@SmokeSet2', '@ODS-1875', '@ODS-1783', '@ODS-1775', '@Dashboard'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation
      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      // Edit project details
      cy.step('Edit project information');
      projectDetails.findActions().click();
      projectDetails.findEditProjectAction().click();
      editProjectModal.shouldBeOpen();
      editProjectModal.findEditProjectName().clear().type(testData.projectEditUpdatedName);
      editProjectModal.findEditDescriptionName().type(testData.projectEditDescription);
      editProjectModal.findSubmitButton().click();

      // Verify project updates
      cy.step(`Verify that the project ${testData.projectEditUpdatedName} has been updated`);
      projectDetails.verifyProjectName(testData.projectEditUpdatedName);
      projectDetails.verifyProjectDescription(testData.projectEditDescription);
    },
  );
});
