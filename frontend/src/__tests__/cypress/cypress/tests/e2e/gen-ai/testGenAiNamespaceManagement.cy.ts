import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  verifyOpenShiftProjectExists,
  deleteOpenShiftProject,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import {
  projectDetails,
  projectListPage,
  createProjectModal,
} from '#~/__tests__/cypress/cypress/pages/projects';
import {
  connectionsPage,
  addConnectionModal,
} from '#~/__tests__/cypress/cypress/pages/connections';
import {
  modelServingGlobal,
  modelServingWizard,
} from '#~/__tests__/cypress/cypress/pages/modelServing';

describe('Verify Gen AI Namespace - Creation and Connection', () => {
  let projectName: string;
  const uuid = generateTestUUID();

  // Setup: Generate project name and ensure clean state
  retryableBefore(() => {
    projectName = `gen-ai-test-${uuid}`;

    if (!projectName) {
      throw new Error('Project name is undefined or empty');
    }

    return verifyOpenShiftProjectExists(projectName).then((exists: boolean) => {
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
    // Delete provisioned Project
    if (projectName) {
      cy.log(`Deleting Project ${projectName} after the test has finished.`);
      deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    }
  });

  it(
    'Create namespace and add URI connection for Gen AI model',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@Namespace', '@Connection'],
    },
    () => {
      // Ignore module federation loading errors (for clusters without Gen AI modules deployed)
      Cypress.on('uncaught:exception', (err) => {
        // Ignore SyntaxError from missing federated modules
        if (
          err.message.includes('expected expression') ||
          err.message.includes('Unexpected token')
        ) {
          return false;
        }
        return true;
      });

      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      projectListPage.navigate();

      // Create project through UI to ensure proper labels
      cy.step('Open Create Project modal');
      createProjectModal.shouldBeOpen(false);
      projectListPage.findCreateProjectButton().click();

      // Input project details
      cy.step(`Create project: ${projectName}`);
      createProjectModal.k8sNameDescription.findDisplayNameInput().type(projectName);
      createProjectModal.k8sNameDescription
        .findDescriptionInput()
        .type('Gen AI Test Project for model connections');

      // Submit project creation
      createProjectModal.findSubmitButton().click();

      // Verify project creation and navigation
      cy.step(`Verify that the project ${projectName} has been created`);
      cy.url().should('include', `/projects/${projectName}`);
      projectDetails.verifyProjectName(projectName);

      // Verify namespace exists in OpenShift
      // cy.step('Verify namespace was created in OpenShift');
      // verifyOpenShiftProjectExists(projectName).then((exists: boolean) => {
      //   if (!exists) {
      //     throw new Error(
      //       `Expected namespace ${projectName} to exist in OpenShift, but it does not.`,
      //     );
      //   }
      //   cy.log(`Verified that namespace ${projectName} exists in OpenShift`);
      // });

      // Navigate to Connections tab (should already be in project details)
      cy.step('Navigate to Connections tab');
      projectDetails.findSectionTab('connections').click();

      // Create Connection
      cy.step('Click Create Connection button');
      connectionsPage.findCreateConnectionButton().click();

      // Create URI connection
      cy.step('Create URI connection for Gen AI model');
      addConnectionModal.findConnectionTypeDropdown().click();
      cy.findByText('URI - v1').click();

      addConnectionModal.findConnectionNameInput().type('whisper-large-v2-w4a16-g128');
      addConnectionModal
        .findConnectionDescriptionInput()
        .type('URI connection for Whisper Large V2 model');

      // Fill in the URI field
      cy.findByTestId('field URI').type(
        'oci://quay.io/redhat-ai-services/modelcar-catalog:whisper-large-v2-w4a16-g128',
      );

      addConnectionModal.findCreateButton().click();

      // Verify connection was created
      cy.step('Verify connection was created successfully');
      connectionsPage.getConnectionRow('whisper-large-v2-w4a16-g128').find().should('exist');
      cy.log('Successfully created URI connection: whisper-large-v2-w4a16-g128');

      // Navigate to Model Serving tab and deploy model
      cy.step('Navigate to Model Serving tab');
      projectDetails.findSectionTab('model-server').click();

      // Deploy the model
      cy.step('Click Deploy Model button');
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      // Step 1: Model Source
      cy.step('Configure model source with existing connection');
      // Wait for the model location select to be fully loaded and interactive
      modelServingWizard.findModelLocationSelect().should('be.visible').should('not.be.disabled');
      modelServingWizard.findModelLocationSelectOption('Existing connection').click();

      // Wait for connection selector to load and verify the connection is auto-selected
      modelServingWizard.findExistingConnectionSelect().should('be.visible');
      modelServingWizard
        .findExistingConnectionValue()
        .should('be.visible')
        .should('have.value', 'whisper-large-v2-w4a16-g128');

      // Select model type
      modelServingWizard.findModelTypeSelect().should('be.visible').should('not.be.disabled');
      modelServingWizard.findModelTypeSelectOption('Generative AI model (Example, LLM)').click();

      modelServingWizard.findNextButton().click();

      // Step 2: Model Deployment
      cy.step('Configure model deployment details');
      modelServingWizard.findModelDeploymentNameInput().clear().type('whisper-large-v2-w4a16-g128');

      // Note: Model format is automatically set to 'vLLM' for Generative AI models
      // and the format selection field is not shown for Gen AI models

      // Select hardware profile
      cy.step('Select hardware profile');
      cy.findByTestId('hardware-profile-select').click();
      cy.findByRole('option', {
        name: (content) => content.includes('gpu-profile'),
      }).click();

      // Note: Hardware profile already contains the necessary resource configurations
      // Including CPU, Memory, and Accelerator settings, so no need to customize

      modelServingWizard.findNextButton().click();

      // Step 3: Advanced Options

      cy.step('Enable AI asset endpoint');
      // Enable "Add as AI asset endpoint" to make model available in playground
      modelServingWizard.findSaveAiAssetCheckbox().click();

      cy.step('Enable external route');
      // Enable external route
      modelServingWizard.findExternalRouteCheckbox().click();

      cy.step('Add serving runtime arguments');
      modelServingWizard.findRuntimeArgsCheckbox().should('exist').click();

      modelServingWizard.findRuntimeArgsTextBox().type(
        `--dtype=half
--gpu-memory-utilization=0.95
--enable-auto-tool-choice
--tool-call-parser=llama3_json
--chat-template=/opt/app-root/template/tool_chat_template_llama3.2_json.jinja`,
      );

      modelServingWizard.findNextButton().click();

      // Step 4: Review and Deploy
      cy.step('Deploy model');
      cy.findByRole('button', { name: /Deploy model/i })
        .should('be.enabled')
        .click();

      // Wait for redirect after submission (goes to project model-server page)
      cy.step('Wait for redirect after model deployment submission');
      cy.url().should('include', `/projects/${projectName}`);

      // Navigate to Deployments page to verify the model
      cy.step('Navigate to Deployments page');
      modelServingGlobal.navigate();

      // Ensure the deployments table is loaded
      cy.findByTestId('inference-service-table', { timeout: 15000 }).should('exist');

      // Verify model deployment was created and started
      cy.step('Verify model deployment was created and started');

      // Wait for the table to load
      cy.findByTestId('inference-service-table', { timeout: 15000 }).should('exist');

      // Find the model row by name
      cy.contains('[data-label=Name]', 'whisper-large-v2-w4a16-g128', { timeout: 30000 })
        .should('be.visible')
        .parents('tr')
        .within(() => {
          // Wait for status to become "Started" (app has built-in polling, so just wait with longer timeout)
          cy.findByTestId('model-status-text', { timeout: 240000 }).should(
            'contain.text',
            'Started',
          );
        });

      cy.log('Successfully deployed and started model: whisper-large-v2-w4a16-g128');
    },
  );
});
