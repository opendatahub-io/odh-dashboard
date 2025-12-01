import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  verifyOpenShiftProjectExists,
  deleteOpenShiftProject,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { checkInferenceServiceState } from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { checkLlamaStackDistributionReady } from '#~/__tests__/cypress/cypress/utils/oc_commands/llamaStackDistribution';
import { waitForResource } from '#~/__tests__/cypress/cypress/utils/oc_commands/baseCommands';
import {
  enableGenAiFeatures,
  disableGenAiFeatures,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/genAi';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import type { GenAiTestData } from '#~/__tests__/cypress/cypress/types';
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
  modelServingSection,
  modelServingWizard,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import { genAiPlayground } from '#~/__tests__/cypress/cypress/pages/genAiPlayground';

describe('Verify Gen AI Namespace - Creation and Connection', () => {
  let testData: GenAiTestData;
  let projectName: string;
  const uuid = generateTestUUID();

  retryableBefore(() =>
    cy
      .fixture('e2e/genAi/testGenAi.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as GenAiTestData;
        projectName = `gen-ai-test-${uuid}`;

        if (!projectName) {
          throw new Error('Project name is undefined or empty');
        }

        return verifyOpenShiftProjectExists(projectName);
      })
      .then((exists: boolean) => {
        if (exists) {
          return deleteOpenShiftProject(projectName);
        }
        return cy.wrap(null);
      })
      .then(() => enableGenAiFeatures()),
  );

  after(() => {
    disableGenAiFeatures();
    if (projectName) {
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

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      projectListPage.navigate();

      cy.step('Open Create Project modal');
      createProjectModal.shouldBeOpen(false);
      projectListPage.findCreateProjectButton().click();

      cy.step(`Create project: ${projectName}`);
      createProjectModal.k8sNameDescription.findDisplayNameInput().type(projectName);
      createProjectModal.k8sNameDescription
        .findDescriptionInput()
        .type(testData.projectDescription);
      createProjectModal.findSubmitButton().click();

      cy.step(`Verify that the project ${projectName} has been created`);
      cy.url().should('include', `/projects/${projectName}`);
      projectDetails.verifyProjectName(projectName);

      cy.step('Navigate to Connections tab');
      projectDetails.findSectionTab('connections').click();

      cy.step('Click Create Connection button');
      connectionsPage.findCreateConnectionButton().click();

      cy.step('Create URI connection for Gen AI model');
      addConnectionModal.findConnectionTypeDropdown().click();
      cy.findByText(testData.connectionType).click();
      addConnectionModal.findConnectionNameInput().type(testData.connectionName);
      addConnectionModal.findConnectionDescriptionInput().type(testData.connectionDescription);
      cy.findByTestId('field URI').type(testData.connectionURI);
      addConnectionModal.findCreateButton().click();

      cy.step('Verify connection was created successfully');
      connectionsPage.getConnectionRow(testData.connectionName).find().should('exist');

      cy.step('Navigate to Model Serving tab');
      projectDetails.findSectionTab('model-server').click();

      cy.step('Click Deploy Model button');
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Configure model source with existing connection');
      modelServingWizard.findModelLocationSelect().should('be.visible').should('not.be.disabled');
      modelServingWizard.findModelLocationSelectOption('Existing connection').click();
      modelServingWizard.findExistingConnectionSelect().should('be.visible');
      modelServingWizard
        .findExistingConnectionValue()
        .should('be.visible')
        .should('have.value', testData.connectionName);
      modelServingWizard.findModelTypeSelect().should('be.visible').should('not.be.disabled');
      modelServingWizard.findModelTypeSelectOption(testData.modelType).click();
      modelServingWizard.findNextButton().click();

      cy.step('Configure model deployment details');
      modelServingWizard.findModelDeploymentNameInput().clear().type(testData.modelDeploymentName);

      cy.step('Select hardware profile');
      cy.findByTestId('hardware-profile-select').click();
      cy.findByRole('option', {
        name: (content) => content.includes('default-profile'),
      }).click();

      cy.step('Expand "Customize resource requests and limits" section');
      cy.findByRole('button', { name: /Customize resource requests and limits/i }).click();

      cy.step('Verify default resource values are displayed');
      modelServingWizard.findCPURequestedInput().should('have.value', '2');
      modelServingWizard.findCPULimitInput().should('have.value', '2');
      modelServingWizard.findMemoryRequestedInput().should('have.value', '4');
      modelServingWizard.findMemoryLimitInput().should('have.value', '4');

      cy.step(`Modify CPU requests from 2 to ${testData.cpuRequested}`);
      modelServingWizard.findCPURequestedButton('Minus').click();
      modelServingWizard
        .findCPURequestedInput()
        .should('have.value', testData.cpuRequested.toString());

      cy.step(`Modify CPU limits from 2 to ${testData.cpuLimit}`);
      modelServingWizard.findCPULimitButton('Plus').click();
      modelServingWizard.findCPULimitButton('Plus').click();
      modelServingWizard.findCPULimitInput().should('have.value', testData.cpuLimit.toString());

      cy.step(`Modify Memory requests from 4 to ${testData.memoryRequested}`);
      modelServingWizard.findMemoryRequestedButton('Plus').click();
      modelServingWizard.findMemoryRequestedButton('Plus').click();
      modelServingWizard.findMemoryRequestedButton('Plus').click();
      modelServingWizard.findMemoryRequestedButton('Plus').click();
      modelServingWizard
        .findMemoryRequestedInput()
        .should('have.value', testData.memoryRequested.toString());

      cy.step(`Modify Memory limits from 4 to ${testData.memoryLimit}`);
      modelServingWizard.findMemoryLimitButton('Plus').click();
      modelServingWizard.findMemoryLimitButton('Plus').click();
      modelServingWizard.findMemoryLimitButton('Plus').click();
      modelServingWizard.findMemoryLimitButton('Plus').click();
      modelServingWizard
        .findMemoryLimitInput()
        .should('have.value', testData.memoryLimit.toString());

      cy.step('Select serving runtime');
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();

      cy.step('Wait for serving runtime options to load');
      cy.findByTestId('global-scoped-serving-runtimes').should('exist');

      cy.step('Select vLLM CPU (amd64 - EXPERIMENTAL) serving runtime');
      cy.findByTestId('global-scoped-serving-runtimes')
        .contains(/vLLM CPU.*\(amd64 - EXPERIMENTAL\)/i)
        .should('exist')
        .click();

      cy.step('Verify global-scoped label is displayed');
      modelServingWizard.findGlobalScopedLabel().should('be.visible');

      modelServingWizard.findNextButton().click();

      cy.step('Enable AI asset endpoint');
      modelServingWizard.findSaveAiAssetCheckbox().click();

      modelServingWizard.findNextButton().click();

      cy.step('Deploy model');
      cy.findByRole('button', { name: /Deploy model/i })
        .should('be.enabled')
        .click();

      cy.step('Wait for redirect after model deployment submission');
      cy.url().should('include', `/projects/${projectName}`);
      modelServingSection.findModelServerDeployedName(testData.modelDeploymentName);

      cy.step('Verify model deployment was created and started');
      waitForResource('inferenceService', 'llama-32-1b-instruct', projectName);
      checkInferenceServiceState('llama-32-1b-instruct', projectName, { checkReady: true });

      cy.step('Navigate to Gen AI Playground');
      cy.visit(`/gen-ai-studio/playground/${projectName}`);
      cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);

      cy.step('Click Create playground button');
      cy.findByTestId('empty-state').should('exist');
      cy.findByRole('button', { name: 'Create playground' }).should('be.visible').click();

      cy.step('Wait for Configure playground modal to open');
      cy.findByRole('dialog', { name: /Configure playground/i }).should('be.visible');

      cy.step('Verify model is selected in the configuration table');
      cy.findByTestId('chatbot-configuration-table').should('exist');
      cy.findByTestId('chatbot-configuration-table')
        .find('tbody tr')
        .contains(testData.modelDeploymentName)
        .parents('tr')
        .within(() => {
          cy.get('input[type="checkbox"]').should('be.checked');
        });

      cy.step('Click Create button in the modal');
      cy.findByRole('dialog', { name: /Configure playground/i })
        .findByRole('button', { name: /^Create$/i })
        .should('be.enabled')
        .click();

      cy.step('Wait for llama-stack-config ConfigMap to be created');
      waitForResource('configmap', 'llama-stack-config', projectName);

      cy.step('Wait for LlamaStackDistribution to be ready');
      checkLlamaStackDistributionReady(projectName);

      cy.step('Navigate to playground URL');
      cy.visit(`/gen-ai-studio/playground/${projectName}`);
      cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);

      cy.step(`Ensure ${testData.modelDeploymentName} model is selected`);
      // Check if our model is in any visible button text (handles prefixes like vllm-inference-1/llama-3.2-1b-instruct)
      cy.get('body').then(($body) => {
        const hasOurModel = $body
          .find('button:visible')
          .text()
          .includes(testData.modelDeploymentName);

        if (!hasOurModel) {
          cy.log('Model not auto-selected, selecting manually');
          // Find the Model dropdown in the right panel (Model details section)
          cy.get('[data-ouia-component-type="PF6/MenuToggle"]').filter(':visible').first().click();
          // Select our model (cy.contains does substring match, so prefix doesn't matter)
          cy.contains(testData.modelDeploymentName).should('be.visible').click();
        } else {
          cy.log('Model already selected (possibly with prefix like vllm-inference-1/)');
        }
      });

      // Verify the model is now selected
      cy.findByRole('button', {
        name: new RegExp(testData.modelDeploymentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      }).should('be.visible');

      cy.step('Verify message input is ready and functional');
      genAiPlayground.findMessageInput().should('be.enabled').and('be.visible');

      cy.step('Send a test message to verify chatbot interface is working');
      genAiPlayground.sendMessage(testData.testMessage);

      cy.step('Verify user message appears in chat');
      cy.get('.pf-chatbot__message--user').should('exist').and('contain', testData.testMessage);

      cy.step(
        'Verify playground is functional (model inference not tested due to slow response time)',
      );
      cy.log('✅ Playground interface is functional and ready to receive messages');
    },
  );
});
