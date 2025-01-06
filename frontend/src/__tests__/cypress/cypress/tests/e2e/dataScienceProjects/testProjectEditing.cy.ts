import type { DataScienceProjectData } from '~/__tests__/cypress/cypress/types';
import { editProjectModal, projectDetails, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import {
  HTPASSWD_CLUSTER_ADMIN_USER
} from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadDSPFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';

describe('Verify Data Science Project - Editing', () => {
  let testData: DataScienceProjectData;
  let projectName: string;

  // Setup: Load test data and ensure clean state
  before(() => {
    return loadDSPFixture('e2e/dataScienceProjects/testProjectEditing.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = testData.projectEditResourceName;
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
  // after(() => {
  //   // Delete provisioned Project
  //   if (projectName) {
  //     cy.log(`Deleting Project ${projectName} after the test has finished.`);
  //     deleteOpenShiftProject(projectName);
  //   }
  // });

  it(
    'Editing a Data Science Project in RHOAI',
    { tags: ['@Sanity', '@SmokeSet3', '@ODS-2112', '@Dashboard', '@Tier1'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation, add user and provide admin permissions
      cy.step(
        `Navigate to the Project list tab and search for ${projectName}`,
      );
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      // Verify project creation
      cy.step(`Verify that the project ${projectName} has been created`);
      cy.url().should('include', `/projects/${testData.projectEditResourceName}`);
      projectDetails.verifyProjectName(testData.projectEditResourceName);

      // Edit the created project and edit the name/description
      cy.step('Editing the project - clicking actions');
      projectDetails.findActions().click();
      projectDetails.findEditProjectAction().click();
      editProjectModal.shouldBeOpen();


    },
  );
});
