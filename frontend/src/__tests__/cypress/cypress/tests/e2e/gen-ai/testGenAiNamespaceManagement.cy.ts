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
import { checkInferenceServiceState } from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';

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

  // after(() => {
  //   // Delete provisioned Project
  //   if (projectName) {
  //     cy.log(`Deleting Project ${projectName} after the test has finished.`);
  //     deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  //   }
  // });

  it(
    'Create namespace and add URI connection for Gen AI model',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@Namespace', '@Connection'],
    },
    () => {
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
      cy.step('Verify namespace was created in OpenShift');
      verifyOpenShiftProjectExists(projectName).then((exists: boolean) => {
        if (!exists) {
          throw new Error(
            `Expected namespace ${projectName} to exist in OpenShift, but it does not.`,
          );
        }
        cy.log(`Verified that namespace ${projectName} exists in OpenShift`);
      });

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

      addConnectionModal.findConnectionNameInput().type('llama-3.2-3b-instruct');
      addConnectionModal
        .findConnectionDescriptionInput()
        .type('URI connection for LLaMA 3.2 3B Instruct model');

      // Fill in the URI field
      cy.findByTestId('field URI').type(
        'oci://quay.io/redhat-ai-services/modelcar-catalog:llama-3.2-3b-instruct',
      );

      addConnectionModal.findCreateButton().click();

      // Verify connection was created
      cy.step('Verify connection was created successfully');
      connectionsPage.getConnectionRow('llama-3.2-3b-instruct').find().should('exist');
      cy.log('Successfully created URI connection: llama-3.2-3b-instruct');

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
        .should('have.value', 'llama-3.2-3b-instruct');

      // Select model type
      modelServingWizard.findModelTypeSelect().should('be.visible').should('not.be.disabled');
      modelServingWizard.findModelTypeSelectOption('Generative AI model (Example, LLM)').click();

      modelServingWizard.findNextButton().click();

      // Step 2: Model Deployment
      cy.step('Configure model deployment details');
      modelServingWizard.findModelDeploymentNameInput().clear().type('llama-3.2-3b-instruct');

      // Note: Model format is automatically set to 'vLLM' for Generative AI models
      // and the format selection field is not shown for Gen AI models

      // Select hardware profile
      cy.step('Select hardware profile');
      cy.findByTestId('hardware-profile-select').click();
      cy.findByRole('option', {
        name: (content) => content.includes('default-profile'),
      }).click();

      // Select serving runtime
      modelServingWizard.findServingRuntimeTemplateSearchSelector().then(($selector) => {
        if (!$selector.is(':disabled')) {
          cy.wrap($selector).click();
          modelServingWizard
            .findGlobalScopedTemplateOption('vLLM NVIDIA GPU ServingRuntime for KServe')
            .should('exist')
            .click();
        }
      });

      // Expand "Customize resource requests and limits" section
      cy.step('Expand and configure resource requests and limits');
      cy.findByTestId('hardware-profile-customize')
        .findByRole('button', { name: 'Customize resource requests and limits' })
        .click();

      // Set CPU requests and limits
      modelServingWizard.findCPURequestedInput().clear().type('1');
      modelServingWizard.findCPULimitInput().clear().type('2');

      // Set Memory requests and limits
      modelServingWizard.findMemoryRequestedInput().clear().type('8');
      modelServingWizard.findMemoryLimitInput().clear().type('8');

      // Note: Accelerator is already configured in the hardware profile 'test-1'
      // No need to select it separately

      modelServingWizard.findNextButton().click();

      // Step 3: Advanced Options

      cy.step('Enable external route');
      // Enable external route
      modelServingWizard.findExternalRouteCheckbox().click();

      cy.step('Add serving runtime arguments');
      // Enable runtime arguments
      modelServingWizard.findRuntimeArgsCheckbox().click();

      // Add runtime arguments
      const runtimeArgs = `--dtype=half
--max-model-len=20000
--gpu-memory-utilization=0.95
--enable-auto-tool-choice
--tool-call-parser=llama3_json
--chat-template=/opt/app-root/template/tool_chat_template_llama3.2_json.jinja
--enable-chunked-prefill`;

      modelServingWizard.findRuntimeArgsTextBox().clear().type(runtimeArgs);

      modelServingWizard.findNextButton().click();

      // Step 4: Review and Submit
      cy.step('Review and submit model deployment');
      modelServingWizard.findSubmitButton().click();

      // Verify model deployment was created
      cy.step('Verify model deployment was created');
      // Wait for the model to appear in the UI with a longer timeout
      cy.findByTestId('deployed-model-name', { timeout: 30000 })
        .contains('llama-3.2-3b-instruct')
        .should('exist');

      // Verify the model is running
      cy.step('Verify that the model deployment is ready');
      checkInferenceServiceState('llama-3.2-3b-instruct', projectName, { checkReady: true });
      cy.log('Successfully deployed model: llama-3.2-3b-instruct');
    },
  );
});
