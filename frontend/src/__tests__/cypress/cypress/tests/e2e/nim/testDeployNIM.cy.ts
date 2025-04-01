import yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  projectListPage,
  createProjectModal,
  projectDetails,
  projectDetailsOverviewTab,
} from '~/__tests__/cypress/cypress/pages/projects';
import type { DataScienceProjectData } from '~/__tests__/cypress/cypress/types';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { nimDeployModal } from '__tests__/cypress/cypress/pages/components/NIMDeployModal';
import { modelServingSection } from '__tests__/cypress/cypress/pages/modelServing';
import { nimCard } from '__tests__/cypress/cypress/pages/components/NIMCard';
import { enabledPage } from '__tests__/cypress/cypress/pages/enabled';
import { explorePage } from '__tests__/cypress/cypress/pages/explore';
import { deleteNIMAccount, validateNIMAccountStatus } from '__tests__/cypress/cypress/utils/oc_commands/baseCommands';

const model = 'phi-3-mini-4k-instruct-latest';

describe(`Deploy NIM model`, () => {
  // Create random number for unique project name
  const randomNum = () => Cypress._.random(0, 1e6);
  const randomNumber = randomNum();
  let testData: DataScienceProjectData;

  before(() => {
    cy.step('Delete odh-nim-account');
    deleteNIMAccount(Cypress.env('TEST_NAMESPACE'), true);
    // Load test data
    return cy.fixture('e2e/nim/testDeploySingleNIM.yaml', 'utf8').then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as DataScienceProjectData;
    });
  });

  beforeEach(() => {
    cy.step('Delete test project');
    deleteOpenShiftProject(
      `${testData.projectDisplayName}-${randomNumber}`,
      { timeout: 450000 },
      true,
    ); // Takes very long time to delete the project
  });

  it('Enable and validate NIM flow', { tags: ['@NIM', '@Sanity'] }, () => {
    cy.step('Login to the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    cy.step('Navigate to the Explore page');
    explorePage.visit();
    cy.step('Validate NIM card contents');
    nimCard
      .getNIMCard()
      .contains(
        'NVIDIA NIM is a set of easy-to-use microservices designed for secure, reliable deployment of high-performance AI model inferencing.',
      );
    cy.step('Click NIM card');
    nimCard.getNIMCard().click();
    cy.step('Click Enable button in NIM card');
    nimCard.getEnableNIMButton().click();
    cy.step('Input NGC API Key');
    nimCard.getNGCAPIKey().type(Cypress.env('NGC_API_KEY'));
    cy.step('Click submit to enable the NIM application');
    nimCard.getNIMSubmit().click();
    cy.step('Wait for Validation to complete');
    nimCard.getProgressTitle().should('exist');
    nimCard.getProgressTitle({ timeout: 120000 }).should('not.exist');
    cy.step('Visit the enabled applications page');
    enabledPage.visit();
    cy.step('Validate NIM Card contents on Enabled page');
    nimCard
      .getNIMCard()
      .contains(
        'NVIDIA NIM is a set of easy-to-use microservices designed for secure, reliable deployment of high-performance AI model inferencing.',
      );
    cy.step('Validate that the NIM card does not contain a Disabled button');
    nimCard.getNIMCard().within(() => {
      cy.contains('button', 'Disabled', { timeout: 60000 }).should('not.exist');
    });
    cy.step('Validate odh-nim-account AccountStatus is True');
    validateNIMAccountStatus('AccountStatus', 'True')
    cy.step('Validate odh-nim-account APIKeyValidation is True');
    validateNIMAccountStatus('APIKeyValidation', 'True')
    cy.step('Validate odh-nim-account ConfigMapUpdate is True');
    validateNIMAccountStatus('ConfigMapUpdate', 'True')
    cy.step('Validate odh-nim-account TemplateUpdate is True');
    validateNIMAccountStatus('TemplateUpdate', 'True')
    cy.step('Validate odh-nim-account SecretUpdate is True');
    validateNIMAccountStatus('SecretUpdate', 'True');
  });

  it(`Deploy ${model} NIM model and verify deployment`, { tags: ['@NIMDeploy', '@GPU'] }, () => {
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
    cy.step('Save the project');
    createProjectModal.findCreateProjectModalCreateButton().click();
    cy.step(
      `Verify that the project ${testData.projectDisplayName}-${randomNumber} has been created`,
    );
    cy.url().should('include', `/projects/${testData.projectResourceName}-${randomNumber}`);
    projectDetails.verifyProjectName(`${testData.projectDisplayName}-${randomNumber}`);
    projectDetails.verifyProjectDescription(`${testData.projectDescription}-${randomNumber}`);
    cy.step('Click NVIDIA NIM tile select button');
    projectDetailsOverviewTab
      .findModelServingPlatform('nvidia-nim')
      .findByTestId('nim-serving-select-button')
      .should('be.enabled')
      .click();
    cy.step('Click Nvidia model serving platfrom button');
    modelServingSection.getModelServingPlatformButton().click();
    cy.step('Type model name');
    nimDeployModal.findModelNameInput().type(model);
    cy.step('Select NIM model from list');
    nimDeployModal.findNIMModelListSelectionToggle().click();
    cy.findByText('Phi-3-Mini-4K-Instruct - latest').click();
    cy.step('Type NIM PVC storage size');
    nimDeployModal.findNimStorageSizeInput().type('{selectall}50');
    cy.step('Select model server size');
    nimDeployModal.findModelServerSizeSelect().click();
    cy.findByTestId('Large').click();
    cy.step('Select the accelerator profile from list');
    nimDeployModal.findAcceleratorProfileSelectToggle().click();
    cy.findByText('NVIDIA GPU').click();
    nimDeployModal.findSubmitButton().click();
    projectDetails.findSectionTab('model-server').click();
    cy.step('Wait for status tool tip to be visible');
    modelServingSection.findStatusTooltip({ timeout: 60000 }).should('be.visible').click();
    cy.step('Wait for status tool tip value to be Loaded');
    modelServingSection
      .findModelStatusTooltip({ timeout: 900000 })
      .should('contain', 'Loaded')
      .then(($tooltip) => {
        const tooltipText = $tooltip.text();
        //   if (tooltipText.includes('Failed')) {
        //     // BUG: https://issues.redhat.com/browse/NVPE-169
        //     // https://issues.redhat.com/browse/RHOAIENG-20232
        //     // throw new Error(`Tooltip status is Failed: ${tooltipText}`);
        //   }
        if (tooltipText.includes('Loaded')) {
          cy.log('Tooltip status is Loaded');
          return;
        }
        if (
          tooltipText.includes('Unknown') ||
          tooltipText.includes('Progressing') ||
          tooltipText.includes('Failed') // BUG: should use above logic once fixed
        ) {
          cy.log(`Waiting for tooltip status to change to Loaded, current status: ${tooltipText}`);
        }
      });
  });
});
