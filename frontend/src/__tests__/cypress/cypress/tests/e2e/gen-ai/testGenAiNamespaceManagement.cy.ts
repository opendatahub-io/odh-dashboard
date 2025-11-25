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
import { genAiPlayground } from '#~/__tests__/cypress/cypress/pages/genAiPlayground';

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

      addConnectionModal.findConnectionNameInput().type('llama-3.2-1b-instruct');
      addConnectionModal
        .findConnectionDescriptionInput()
        .type('URI connection for Llama 3.2 1B Instruct model');

      // Fill in the URI field
      cy.findByTestId('field URI').type(
        'oci://quay.io/redhat-ai-services/modelcar-catalog:llama-3.2-1b-instruct',
      );

      addConnectionModal.findCreateButton().click();

      // Verify connection was created
      cy.step('Verify connection was created successfully');
      connectionsPage.getConnectionRow('llama-3.2-1b-instruct').find().should('exist');
      cy.log('Successfully created URI connection: llama-3.2-1b-instruct');

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
        .should('have.value', 'llama-3.2-1b-instruct');

      // Select model type
      modelServingWizard.findModelTypeSelect().should('be.visible').should('not.be.disabled');
      modelServingWizard.findModelTypeSelectOption('Generative AI model (Example, LLM)').click();

      modelServingWizard.findNextButton().click();

      // Step 2: Model Deployment
      cy.step('Configure model deployment details');
      modelServingWizard.findModelDeploymentNameInput().clear().type('llama-3.2-1b-instruct');

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
      cy.contains('[data-label=Name]', 'llama-3.2-1b-instruct', { timeout: 30000 })
        .should('be.visible')
        .parents('tr')
        .within(() => {
          // Wait for status to become "Started" (app has built-in polling, so just wait with longer timeout)
          cy.findByTestId('model-status-text', { timeout: 300000 }).should(
            'contain.text',
            'Started',
          );
        });

      cy.log('Successfully deployed and started model: llama-3.2-1b-instruct');

      // Navigate to Gen AI Playground
      cy.step('Navigate to Gen AI Playground');
      cy.visit(`/gen-ai-studio/playground/${projectName}`);
      cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);
      cy.log(`Successfully navigated to playground for namespace: ${projectName}`);

      // Create playground by clicking the Create playground button
      cy.step('Click Create playground button');
      cy.findByTestId('empty-state').should('exist');
      cy.findByRole('button', { name: 'Create playground' }).should('be.visible').click();

      // Wait for the Configure playground modal to open
      cy.step('Wait for Configure playground modal to open');
      cy.findByRole('dialog', { name: /Configure playground/i }).should('be.visible');

      // Verify the model is selected in the table
      cy.step('Verify model is selected in the configuration table');
      cy.findByTestId('chatbot-configuration-table').should('exist');

      // Find the table row containing our model and verify its checkbox is checked
      cy.findByTestId('chatbot-configuration-table')
        .find('tbody tr')
        .contains('llama-3.2-1b-instruct')
        .parents('tr')
        .within(() => {
          // Verify the checkbox within this row is checked
          cy.get('input[type="checkbox"]').should('be.checked');
        });

      // Click the Create button in the modal
      cy.step('Click Create button in the modal');
      cy.findByRole('dialog', { name: /Configure playground/i })
        .findByRole('button', { name: /^Create$/i })
        .should('be.enabled')
        .click();

      cy.log('Successfully clicked Create button to create the playground');

      // Navigate to the playground and wait for it to finish creating
      cy.step('Navigate to playground URL and wait for creation to complete');
      cy.visit(`/gen-ai-studio/playground/${projectName}`);
      cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);

      // Wait for the playground to finish creating
      // The "Creating playground" text appears during initialization
      cy.step('Wait for playground creation to complete');
      cy.findByText('Creating playground', { timeout: 10000 }).should('exist');

      // Wait for the playground to be ready (creating text should disappear)
      // Extended timeout to allow for model initialization
      cy.findByText('Creating playground', { timeout: 120000 }).should('not.exist');

      // Verify the model appears in the Model dropdown in ChatbotSettingsPanel
      cy.step('Verify model appears in the Model dropdown');
      cy.findByRole('button', {
        name: /llama-3.2-1b-instruct/i,
        timeout: 10000,
      }).should('be.visible');
      cy.log('Successfully verified model is available in the playground dropdown');

      // Test chatbot interaction with a simple deterministic geography question
      cy.step('Send a test message to the chatbot');
      const testQuestion = 'Where is New York?';

      // First, verify we have the welcome message
      genAiPlayground.findAllBotMessages().should('have.length', 1);

      // Verify the input is not disabled and send button is enabled
      cy.step('Verify message input is ready');
      genAiPlayground.findMessageInput().should('be.enabled').and('be.visible');

      // Send the message
      genAiPlayground.sendMessage(testQuestion);

      // Verify user message appears in the chat
      cy.step('Verify user message appears in chat');
      cy.get('.pf-chatbot__message--user').should('exist').and('contain', testQuestion);

      // Wait for bot response to appear (2 bot messages: welcome + response)
      cy.step('Wait for chatbot to generate response');
      genAiPlayground.findAllBotMessages().should('have.length.at.least', 2, { timeout: 60000 });

      // Wait for the loading state to complete (response should not contain "loading message")
      cy.step('Wait for loading to complete');
      genAiPlayground
        .findBotMessageContent()
        .should('be.visible')
        .invoke('text')
        .should('not.contain', 'loading message'); // Wait until loading is done

      // Wait for the actual response content to have substantial text
      cy.step('Wait for chatbot response content to complete streaming');
      genAiPlayground
        .findBotMessageContent()
        .invoke('text')
        .should((text) => {
          const cleanText = text.trim().toLowerCase();
          // Response should have substantial content and not be loading state
          expect(cleanText).to.have.length.greaterThan(20);
          expect(cleanText).to.not.contain('loading');
        });

      // Verify the response contains expected answer and log it
      cy.step('Verify chatbot response contains United States or America');
      genAiPlayground
        .findBotMessageContent()
        .invoke('text')
        .then((text) => {
          const cleanText = text.trim();
          const lowerText = cleanText.toLowerCase();
          cy.log(`Chatbot response: ${cleanText}`);
          // Check if response contains "united states" or "america"
          expect(lowerText).to.satisfy(
            (txt: string) => txt.includes('united states') || txt.includes('america'),
            'Response should mention United States or America',
          );
        });
    },
  );
});
