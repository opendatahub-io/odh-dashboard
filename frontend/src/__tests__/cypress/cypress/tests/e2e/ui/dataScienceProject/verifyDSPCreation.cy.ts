import yaml from 'js-yaml';
import { ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
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

  before(() => {
    return cy.fixture('e2e/dataScienceProject.yaml', 'utf8')
      .then((yamlContent: string) => {
        // Parse the YAML content
        testData = yaml.load(yamlContent) as DataScienceProjectData;
        const projectName = testData.dspOCName;
  
        // Check if the project name is defined
        if (!projectName) {
          throw new Error('Project name is undefined or empty');
        }
  
        // Verify if the OpenShift project exists
        return verifyOpenShiftProjectExists(projectName);
      })
      .then((exists) => {
        const projectName = testData.dspOCName;
        if (exists) {
          cy.log(`Project ${projectName} exists. Deleting before test.`);
          return deleteOpenShiftProject(projectName);
        } else {
          cy.log(`Project ${projectName} does not exist. Proceeding with test.`);
          return cy.wrap(null); // Return a resolved promise
        }
      });
  });

  it('Create a Data Science Project in RHOAI', () => {
    // Step 1: Log into the application
    cy.step('Log into the application');
    cy.visitWithLogin('/', ADMIN_USER);
    projectListPage.navigate();

    // Step 2: Open the Create Data Science Project modal
    cy.step('Open Create Data Science Project modal');
    createProjectModal.shouldBeOpen(false);
    projectListPage.findCreateProjectButton().click();

    // Step 3: Enter project information
    cy.step('Enter valid project information');
    // Use test data for project name and description
    createProjectModal.k8sNameDescription
      .findDisplayNameInput()
      .type(testData.dspCreationProjectName);
    createProjectModal.k8sNameDescription
      .findDescriptionInput()
      .type(testData.dspCreationProjectDescription);

    // Step 4: Save the project
    cy.step('Save the project and verify it was created successfully');
    createProjectModal.findSubmitButton().click();

    // Step 5: Verify the project has been created
    cy.step(`Verify that the project ${testData.dspCreationProjectName} has been created`);
    cy.url().should('include', `/projects/${testData.dspOCName}`);
    projectDetails.verifyProjectName(testData.dspCreationProjectName);

    cy.step(`Verify that the description ${testData.dspCreationProjectDescription} displays`);
    projectDetails.verifyProjectDescription(testData.dspCreationProjectDescription);

    //Step 6: Delete the project
    cy.step('Deleting the project - clicking actions');
    projectDetails.findActions().click();
    projectDetails.findDeleteProjectAction().click();

    cy.step('Entering project details for deletion');
    deleteModal.shouldBeOpen();
    deleteModal.findInput().type(testData.dspCreationProjectName);

    cy.step('Clicking Submit to delete the project');
    deleteModal.findSubmitButton().should('be.enabled').click();

    //Step 7: Navigate to the Project list page and search for the Project
    cy.step(`Verify that the project ${testData.dspCreationProjectName} has been deleted`);
    projectListPage.filterProjectByName(testData.dspCreationProjectName);
    projectListPage.findEmptyResults();
  });
});
