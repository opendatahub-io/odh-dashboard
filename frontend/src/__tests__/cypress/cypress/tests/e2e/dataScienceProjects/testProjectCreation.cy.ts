import yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  projectListPage,
  createProjectModal,
  projectDetails,
} from '~/__tests__/cypress/cypress/pages/projects';
import {
  verifyOpenShiftProjectExists,
  deleteOpenShiftProject,
} from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import type { DataScienceProjectData } from '~/__tests__/cypress/cypress/types';

describe('Verify Data Science Project - Creation and Deletion', () => {
  let testData: DataScienceProjectData;

  // Setup: Load test data and ensure clean state
  before(() => {
    return cy
      .fixture('e2e/dataScienceProjects/dataScienceProject.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as DataScienceProjectData;
        const projectName = testData.dsOCProjectName;

        if (!projectName) {
          throw new Error('Project name is undefined or empty');
        }

        return verifyOpenShiftProjectExists(projectName);
      })
      .then((exists: boolean) => {
        const projectName = testData.dsOCProjectName;
        // Clean up existing project if it exists
        if (exists) {
          cy.log(`Project ${projectName} exists. Deleting before test.`);
          return deleteOpenShiftProject(projectName);
        }
        cy.log(`Project ${projectName} does not exist. Proceeding with test.`);
        // Return a resolved promise to ensure a value is always returned
        return cy.wrap(null);
      });
  });

  it('Create and Delete a Data Science Project in RHOAI', () => {
    // Authentication and navigation
    cy.step('Log into the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    projectListPage.navigate();

    // Initiate project creation
    cy.step('Open Create Data Science Project modal');
    createProjectModal.shouldBeOpen(false);
    projectListPage.findCreateProjectButton().click();

    // Input project details
    cy.step('Enter valid project information');
    createProjectModal.k8sNameDescription.findDisplayNameInput().type(testData.dsProjectName);
    createProjectModal.k8sNameDescription
      .findDescriptionInput()
      .type(testData.dsProjectDescription);

    // Submit project creation
    cy.step('Save the project');
    createProjectModal.findSubmitButton().click();

    // Verify project creation
    cy.step(`Verify that the project ${testData.dsProjectName} has been created`);
    cy.url().should('include', `/projects/${testData.dsOCProjectName}`);
    projectDetails.verifyProjectName(testData.dsProjectName);
    projectDetails.verifyProjectDescription(testData.dsProjectDescription);

    // Initiate project deletion
    cy.step('Deleting the project - clicking actions');
    projectDetails.findActions().click();
    projectDetails.findDeleteProjectAction().click();

    // Confirm project deletion
    cy.step('Entering project details for deletion');
    deleteModal.shouldBeOpen();
    deleteModal.findInput().type(testData.dsProjectName);
    deleteModal.findSubmitButton().should('be.enabled').click();

    // Verify project deletion
    cy.step(`Verify that the project ${testData.dsProjectName} has been deleted`);
    projectListPage.filterProjectByName(testData.dsProjectName);
    projectListPage.findEmptyResults();
  });
});
