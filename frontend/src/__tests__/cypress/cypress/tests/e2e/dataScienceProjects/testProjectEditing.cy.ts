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

describe('Verify Data Science Project - Editing Project Name and Description', () => {
  let testData: DataScienceProjectData;
  let projectName: string;
  let projectEditedName: string;

  // Setup: Load test data and ensure clean state
  before(() => {
    return loadDSPFixture('e2e/dataScienceProjects/testProjectEditing.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = testData.projectEditResourceName;
        projectEditedName = testData.projectEditUpdatedName;
        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded initial create project name: ${projectName}`);
        cy.log(`Loaded project name after editing: ${projectEditedName}`);
        return createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Project ${projectName} confirmed to be created and verified successfully`);
      });
  });
  after(() => {
    // Delete provisioned Project
    if (projectName) {
      cy.log(`Deleting Edited Project ${projectName} after the test has finished.`);
      deleteOpenShiftProject(projectName);
    }
  });

  it(
    'Edit and Update a Data Science Project in RHOAI',
    { tags: ['@Sanity', '@SanitySet1', '@ODS-2112', '@Dashboard'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation, add user and provide admin permissions
      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      // Verify project creation
      cy.step(`Verify that the project ${projectName} has been created`);
      cy.url().should('include', `/projects/${testData.projectEditResourceName}`);
      projectDetails.verifyProjectName(testData.projectEditResourceName);

      // Edit the created project and edit the name/description
      cy.step('Editing the project - both the Name and Description');
      projectDetails.findActions().click();
      projectDetails.findEditProjectAction().click();
      editProjectModal.shouldBeOpen();
      editProjectModal.findEditProjectName().clear();
      editProjectModal.findEditProjectName().type(testData.projectEditUpdatedName);
      editProjectModal.findEditDescriptionName().type(testData.projectEditDescription);
      editProjectModal.findSubmitButton().click();

      // Verify the edit was successful and the updated details display
      cy.step('Verifying the Edited details display after updating');
      projectDetails.verifyProjectName(testData.projectEditUpdatedName);
      projectDetails.verifyProjectDescription(testData.projectEditDescription);
    },
  );
});
