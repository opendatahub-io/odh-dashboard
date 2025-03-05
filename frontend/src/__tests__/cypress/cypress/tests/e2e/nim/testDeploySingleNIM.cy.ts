import yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  projectListPage,
  createProjectModal,
  projectDetails,
  projectDetailsOverviewTab,
} from '~/__tests__/cypress/cypress/pages/projects';
import type { DataScienceProjectData } from '~/__tests__/cypress/cypress/types';
import {
  verifyOpenShiftProjectExists,
  deleteOpenShiftProject,
} from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { nimDeployModal } from '../../../pages/components/NIMDeployModal';
import { modelServingSection } from '../../../pages/modelServing';

let models = ['phi-3-mini-4k-instruct-latest'];

describe(`Deploy NIM model`, () => {
  const randomNum = () => Cypress._.random(0, 1e6);
  const randomNumber = randomNum();
  let testData: DataScienceProjectData;

  // Setup: Load test data and ensure clean state
  before(() => {
    return cy
      .fixture('e2e/nim/testDeploySingleNIM.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as DataScienceProjectData;
        const projectName = `${testData.projectResourceName}-${randomNumber}`;

        if (!projectName) {
          throw new Error('Project name is undefined or empty');
        }

        return verifyOpenShiftProjectExists(projectName);
      })
      .then((exists: boolean) => {
        const projectName = `${testData.projectResourceName}-${randomNumber}`;
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

  after(() => {
    deleteOpenShiftProject(`${testData.projectDisplayName}-${randomNumber}`, { timeout: 450000 }); // Takes very long time to delete the project
  });

  it(`Deploy ${models[0]} NIM and verify deployment`, () => {
    // Authentication and navigation
    cy.step('Login to the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

    cy.step('Navigate to the DataScience Project page');
    projectListPage.visit();
    createProjectModal.shouldBeOpen(false);
    projectListPage.findCreateProjectButton().click();
    cy.step('Enter valid project information');
    createProjectModal.k8sNameDescription
      .findDisplayNameInput()
      .type(`${testData.projectDisplayName}-${randomNumber}`);
    createProjectModal.k8sNameDescription
      .findDescriptionInput()
      .type(`${testData.projectDescription}-${randomNumber}`);
    // Submit project creation
    cy.step('Save the project');
    createProjectModal.findSubmitButton().click();

    // Verify project creation
    cy.step(
      `Verify that the project ${testData.projectDisplayName}-${randomNumber} has been created`,
    );
    cy.url().should('include', `/projects/${testData.projectResourceName}-${randomNumber}`);
    projectDetails.verifyProjectName(`${testData.projectDisplayName}-${randomNumber}`);
    projectDetails.verifyProjectDescription(`${testData.projectDescription}-${randomNumber}`);
    projectDetailsOverviewTab
      .findModelServingPlatform('nvidia-nim')
      .findByTestId('nim-serving-select-button')
      .should('be.enabled')
      .click();
    cy.findByTestId('model-serving-platform-button').click();
    nimDeployModal.findModelNameInput().type(models[0]);
    nimDeployModal.selectNIMToDeploy(models[0]);
    nimDeployModal.findNimStorageSizeInput().type('{selectall}50');
    nimDeployModal.findModelServerSizeSelect().findSelectOption(/Large/).click();
    nimDeployModal.selectAccelerator('NVIDIA GPU');
    nimDeployModal.findSubmitButton().click();
    projectDetails.findSectionTab('model-server').click();
    modelServingSection.waitForStatusToolTipValue('Loaded', 900000)
  });
});
