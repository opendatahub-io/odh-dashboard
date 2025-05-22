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
import { retryableBefore } from '~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '~/__tests__/cypress/cypress/utils/uuidGenerator';

describe('Verify Data Science Project - Creation and Deletion', () => {
  let testData: DataScienceProjectData;
  let projectName: string;
  const uuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() => {
    return cy
      .fixture('e2e/dataScienceProjects/testProjectCreation.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as DataScienceProjectData;
        projectName = `${testData.projectResourceName}-${uuid}`;

        if (!projectName) {
          throw new Error('Project name is undefined or empty');
        }

        return verifyOpenShiftProjectExists(projectName);
      })
      .then((exists: boolean) => {
        // Clean up existing project if it exists
        if (exists) {
          cy.log(`Project ${projectName} exists. Deleting before test.`);
          return deleteOpenShiftProject(projectName, { wait: false });
        }
        cy.log(`Project ${projectName} does not exist. Proceeding with test.`);
        // Return a resolved promise to ensure a value is always returned
        return cy.wrap(null);
      });
  });

  it(
    'Create and Delete a Data Science Project in RHOAI',
    { tags: ['@Smoke', '@SmokeSet2', '@ODS-1875', '@ODS-1783', '@ODS-1775', '@Dashboard'] },
    () => {
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
      createProjectModal.k8sNameDescription.findDisplayNameInput().type(projectName);
      createProjectModal.k8sNameDescription
        .findDescriptionInput()
        .type(testData.projectDescription);

      // Submit project creation
      cy.step('Save the project');
      createProjectModal.findSubmitButton().click();

      // Verify project creation
      cy.step(`Verify that the project ${projectName} has been created`);
      cy.url().should('include', `/projects/${projectName}`);
      projectDetails.verifyProjectName(projectName);
      projectDetails.verifyProjectDescription(testData.projectDescription);

      // Initiate project deletion
      cy.step('Deleting the project - clicking actions');
      projectDetails.findActions().click();
      projectDetails.findDeleteProjectAction().click();

      // Confirm project deletion
      cy.step('Entering project details for deletion');
      deleteModal.shouldBeOpen();
      deleteModal.findInput().type(projectName);
      deleteModal.findSubmitButton().should('be.enabled').click();

      // Verify project deletion
      cy.step(`Verify that the project ${projectName} has been deleted`);
      projectListPage.filterProjectByName(projectName);
      projectListPage.findEmptyResults();
    },
  );
  it(
    'Verify users cannot create a project with Empty title',
    { tags: ['@Smoke', '@SmokeSet2', '@ODS-1875', '@ODS-1783', '@ODS-1775', '@Dashboard'] },
    () => {
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
      createProjectModal.k8sNameDescription
        .findDescriptionInput()
        .type(testData.projectDescription);

      // Confirm that the Submit button is disabled
      cy.step('Verify the submit button is disabled');
      createProjectModal.findSubmitButton().should('be.disabled');
    },
  );
  it(
    'Verify User cannot create a project using special characters or long names in the Resource name field',
    { tags: ['@Smoke', '@SmokeSet2', '@ODS-1875', '@ODS-1783', '@ODS-1775', '@Dashboard'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      projectListPage.navigate();

      // Initiate project creation
      cy.step('Open Create Data Science Project modal');
      createProjectModal.shouldBeOpen(false);
      projectListPage.findCreateProjectButton().click();

      // Enter invalid resource details
      cy.step(
        'Enter invalid resource details - iterate through the array defined in the fixtures file',
      );
      createProjectModal.k8sNameDescription.findResourceEditLink().click();
      createProjectModal.k8sNameDescription.findDisplayNameInput().type(projectName);

      // Test each invalid resource name
      cy.step('Test invalid resource name and verify that project creation is prevented');

      testData.invalidResourceNames.forEach((invalidResourceName) => {
        cy.log(`Testing invalid resource name: ${invalidResourceName}`);

        // Clear input, type invalid resource name, and validate behavior
        createProjectModal.k8sNameDescription
          .findResourceNameInput()
          .clear()
          .type(invalidResourceName);
        createProjectModal.k8sNameDescription
          .findResourceNameInput()
          .should('have.attr', 'aria-invalid', 'true');
        createProjectModal.findSubmitButton().should('be.disabled');
        // Log success message for invalid resources names being rejected
        cy.log(`✅ ${invalidResourceName}: not authorised as a Resource Name`);
      });
    },
  );
});
