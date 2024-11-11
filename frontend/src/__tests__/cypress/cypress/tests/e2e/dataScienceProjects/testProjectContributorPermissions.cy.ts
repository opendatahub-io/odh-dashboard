import yaml from 'js-yaml';
import {
  verifyOpenShiftProjectExists,
  deleteOpenShiftProject,
  createOpenShiftProject,
} from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { projectDetails, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import type { DataScienceProjectData } from '~/__tests__/cypress/cypress/types';
import { permissions } from '~/__tests__/cypress/cypress/pages/permissions';
import { ADMIN_USER, TEST_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';

describe('Verify that users can provide contributor project permissions to non-admin users', () => {
  let testData: DataScienceProjectData;
  let projectName: string;

  // Setup: Load test data and ensure clean state
  before(() => {
    cy.fixture('e2e/dataScienceProjects/dataScienceProject.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as DataScienceProjectData;
        projectName = testData.dsOCProjectPermissionsContributorName;

        if (!projectName) {
          throw new Error('Project name is undefined or empty');
        }

        return verifyOpenShiftProjectExists(projectName);
      })
      .then((exists: boolean) => {
        if (exists) {
          cy.log(`Project ${projectName} exists. Deleting before test.`);
          return deleteOpenShiftProject(projectName).then(() => {
            cy.log(`Creating project ${projectName} after deletion.`);
            return createOpenShiftProject(projectName);
          });
        }
        cy.log(`Project ${projectName} does not exist. Creating it now.`);
        return createOpenShiftProject(projectName);
      });
  });

  after(() => {
    // Delete provisioned Project
    if (projectName) {
      cy.log(`Deleting Project ${projectName} after the test has finished.`);
      deleteOpenShiftProject(projectName);
    }
  });

  it('Verify that user can be added as a Contributor for a Project', () => {
    // Authentication and navigation
    cy.step('Log into the application');
    cy.visitWithLogin('/', ADMIN_USER);

    // Project navigation, add user and provide contributor permissions
    cy.step(
      `Navigate to the Project list tab and search for ${testData.dsOCProjectPermissionsContributorName}`,
    );
    projectListPage.navigate();
    projectListPage.filterProjectByName(testData.dsOCProjectPermissionsContributorName);
    projectListPage.findProjectLink(testData.dsOCProjectPermissionsContributorName).click();
    projectDetails.findSectionTab('permissions').click();

    cy.step('Assign contributor user Project Permissions');
    permissions.findAddUserButton().click();
    permissions.getUserTable().findAddInput().type(TEST_USER.USERNAME);
    cy.debug();
    permissions
      .getUserTable()
      .selectPermission(TEST_USER.USERNAME, 'Contributor View and edit the project components');

    cy.step(
      `Save the user and validate that ${TEST_USER.USERNAME} has been saved with Contributor permissions`,
    );
    permissions.getUserTable().findSaveNewButton().should('exist').and('be.visible').click();
    cy.contains(TEST_USER.USERNAME).should('exist');
  });
  it('Verify that user can access the created project as a Contributor', () => {
    // Authentication and navigation
    cy.step(`Log into the application with ${TEST_USER.USERNAME}`);
    cy.visitWithLogin('/', TEST_USER);

    // Project navigation and validate permissions tab is accessible
    cy.step('Verify that the user has access to the created project but cannot access Permissions');
    projectListPage.navigate();
    projectListPage.filterProjectByName(testData.dsOCProjectPermissionsContributorName);
    projectListPage.findProjectLink(testData.dsOCProjectPermissionsContributorName).click();
    cy.log('Attempting to find permissions tab which should not be visible');
    projectDetails.findSectionTab('permissions').should('not.exist');
  });
});
