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

describe('Test deploy multiple models in same namespace', () => {
  const randomNum = () => Cypress._.random(0, 1e6);
  const randomNumber = randomNum();
  let testData: DataScienceProjectData;
  //   let nimModelName = 'llama-3.1-8b-base-latest';
  let nimModelName = 'phi-3-mini-4k-instruct-latest';
  let nimModelStorageSize = '50';
  let nimModelServerSize = /Large/;

  before(() => {
    return cy
      .fixture('e2e/nim/testDeployMultipleNIMInSameProject.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as DataScienceProjectData;
        const projectName = `${testData.projectResourceName}-${randomNumber}`;

        if (!projectName) {
          throw new Error('Project name is undefined or empty');
        }

        return verifyOpenShiftProjectExists(projectName);
      })
      .then((exists: boolean) => {
        const projectName = `${testData.projectDisplayName}-${randomNumber}`;
        if (exists) {
          cy.log(`Project ${projectName} exists. Deleting before test.`);
          return deleteOpenShiftProject(projectName);
        }
        cy.log(`Project ${projectName} does not exist. Proceeding with test.`);
        return cy.wrap(null);
      });
  });
  it(`Deploy two ${nimModelName} NIM models in same namespace and verify deployment`, () => {
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
      .type(`${testData.projectDisplayName}-${randomNumber}`);
    // Submit project creation
    cy.step('Save the project');
    createProjectModal.findSubmitButton().click();

    // Verify project creation
    projectDetails.verifyProjectName(`${testData.projectDisplayName}-${randomNumber}`);
    projectDetailsOverviewTab
      .findModelServingPlatform('nvidia-nim')
      .findByTestId('nim-serving-select-button')
      .should('be.enabled')
      .click();
    cy.findByTestId('model-serving-platform-button').click();
    nimDeployModal.findModelNameInput().type('multiple-model-same-ns-1');
    nimDeployModal.selectNIMToDeploy(nimModelName);
    nimDeployModal.findNimStorageSizeInput().type(`{selectall}${nimModelStorageSize}`);
    nimDeployModal.findModelServerSizeSelect().findSelectOption(nimModelServerSize).click();
    nimDeployModal.selectAccelerator('NVIDIA GPU');
    nimDeployModal.findSubmitButton().click();
    projectDetails.findSectionTab('model-server').click();
    modelServingSection
      .getKServeRow('multiple-model-same-ns-1')
      .findStatusTooltip({ timeout: 30000 })
      .should('be.visible')
      .click();
    modelServingSection.findModelStatusTooltipValue('Loaded', {timeout: 900000})
    // second model
    cy.findByTestId('deploy-button').click();
    nimDeployModal.findModelNameInput().type('multiple-model-same-ns-2');
    nimDeployModal.selectNIMToDeploy(nimModelName);
    nimDeployModal.findNimStorageSizeInput().type(`{selectall}${nimModelStorageSize}`);
    nimDeployModal.findModelServerSizeSelect().findSelectOption(nimModelServerSize).click();
    nimDeployModal.selectAccelerator('NVIDIA GPU');
    nimDeployModal.findSubmitButton().click();
    projectDetails.findSectionTab('model-server').click();
    modelServingSection
      .getKServeRow('multiple-model-same-ns-2')
      .findStatusTooltip({ timeout: 30000 })
      .should('be.visible')
      .click();
    modelServingSection.findModelStatusTooltipValue('Loaded', {timeout: 900000})
  });
});
