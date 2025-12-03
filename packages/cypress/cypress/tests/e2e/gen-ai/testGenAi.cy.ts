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
import { getCustomResource } from '#~/__tests__/cypress/cypress/utils/oc_commands/customResources';
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
  let skipTest = false;
  const uuid = generateTestUUID();

  retryableBefore(() => {
    // Check if the operator is RHOAI, if it's not (ODH), skip the test
    cy.step('Check if the operator is RHOAI');
    getCustomResource('redhat-ods-operator', 'Deployment', 'name=rhods-operator').then((result) => {
      if (!result.stdout.includes('rhods-operator')) {
        cy.log('RHOAI operator not found, skipping the test (Gen AI is RHOAI-specific).');
        skipTest = true;
      } else {
        cy.log('RHOAI operator confirmed:', result.stdout);
      }
    });

    // If not skipping, proceed with test setup
    cy.then(() => {
      if (skipTest) {
        return;
      }

      cy.fixture('e2e/genAi/testGenAi.yaml', 'utf8')
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
        .then(() => enableGenAiFeatures());
    });
  });

  after(() => {
    if (skipTest) {
      return;
    }

    disableGenAiFeatures();

    if (projectName) {
      deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    }
  });

  // Ignore module federation loading errors (for clusters without Gen AI modules deployed)
  beforeEach(() => {
    Cypress.on('uncaught:exception', (err) => {
      // Ignore SyntaxError from missing federated modules
      if (err.message.includes('expected expression') || err.message.includes('Unexpected token')) {
        return false;
      }
      return true;
    });
  });

  it(
    'Create namespace and add URI connection for Gen AI model',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@Namespace', '@Connection'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping test - Gen AI is RHOAI-specific and not available on ODH.');
        return;
      }

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
      addConnectionModal.findConnectionTypeOption(testData.connectionType).click();
      addConnectionModal.findConnectionNameInput().type(testData.connectionName);
      addConnectionModal.findConnectionDescriptionInput().type(testData.connectionDescription);
      addConnectionModal.findUriField().type(testData.connectionURI);
      addConnectionModal.findCreateButton().click();

      cy.step('Verify connection was created successfully');
      connectionsPage.getConnectionRow(testData.connectionName).find().should('exist');
    },
  );

  it(
    'Deploy Gen AI model using existing connection',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@ModelServing', '@Deployment'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping test - Gen AI is RHOAI-specific and not available on ODH.');
        return;
      }

      cy.step('Log into the application and navigate to project');
      cy.visitWithLogin(`/projects/${projectName}`, HTPASSWD_CLUSTER_ADMIN_USER);

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
      modelServingWizard.findHardwareProfileSelect().click();
      modelServingWizard.findHardwareProfileOption('default-profile').click();

      cy.step('Expand "Customize resource requests and limits" section');
      modelServingWizard.findCustomizeResourcesButton().click();

      cy.step('Read and log default resource values (if any)');
      modelServingWizard
        .findCPURequestedInput()
        .invoke('val')
        .then((val) => {
          cy.log(`Default CPU Requested: ${val || '(empty)'}`);
        });

      modelServingWizard
        .findCPULimitInput()
        .invoke('val')
        .then((val) => {
          cy.log(`Default CPU Limit: ${val || '(empty)'}`);
        });

      modelServingWizard
        .findMemoryRequestedInput()
        .invoke('val')
        .then((val) => {
          cy.log(`Default Memory Requested: ${val || '(empty)'}`);
        });

      modelServingWizard
        .findMemoryLimitInput()
        .invoke('val')
        .then((val) => {
          cy.log(`Default Memory Limit: ${val || '(empty)'}`);
        });

      cy.step(`Modify CPU requests to ${testData.cpuRequested}`);
      modelServingWizard.findCPURequestedInput().clear().type(testData.cpuRequested.toString());
      modelServingWizard
        .findCPURequestedInput()
        .should('have.value', testData.cpuRequested.toString());

      cy.step(`Modify CPU limits to ${testData.cpuLimit}`);
      modelServingWizard.findCPULimitInput().clear().type(testData.cpuLimit.toString());
      modelServingWizard.findCPULimitInput().should('have.value', testData.cpuLimit.toString());

      cy.step(`Modify Memory requests to ${testData.memoryRequested}`);
      modelServingWizard
        .findMemoryRequestedInput()
        .clear()
        .type(testData.memoryRequested.toString());
      modelServingWizard
        .findMemoryRequestedInput()
        .should('have.value', testData.memoryRequested.toString());

      cy.step(`Modify Memory limits to ${testData.memoryLimit}`);
      modelServingWizard.findMemoryLimitInput().clear().type(testData.memoryLimit.toString());
      modelServingWizard
        .findMemoryLimitInput()
        .should('have.value', testData.memoryLimit.toString());

      cy.step('Select serving runtime');
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();

      cy.step('Wait for serving runtime options to load');
      modelServingWizard.findGlobalScopedServingRuntimes().should('exist');

      cy.step(`Select ${testData.servingRuntime} serving runtime`);
      modelServingWizard.findServingRuntimeOption(testData.servingRuntime).should('exist').click();

      cy.step('Verify global-scoped label is displayed');
      modelServingWizard.findGlobalScopedLabel().should('be.visible');

      modelServingWizard.findNextButton().click();

      cy.step('Enable AI asset endpoint');
      modelServingWizard.findSaveAiAssetCheckbox().click();

      modelServingWizard.findNextButton().click();

      cy.step('Wait for Review step to load');
      modelServingWizard.findReviewStepModelDetailsSection().should('be.visible');

      cy.step('Deploy model');
      modelServingWizard.findDeployButton().should('be.enabled').click();

      cy.step('Wait for redirect after model deployment submission');
      cy.url().should('include', `/projects/${projectName}`);
      modelServingSection.findModelServerDeployedName(testData.modelDeploymentName);

      cy.step('Verify model deployment was created and started');
      waitForResource('inferenceService', testData.inferenceServiceName, projectName);
      checkInferenceServiceState(testData.inferenceServiceName, projectName, { checkReady: true });
    },
  );

  it(
    'Create and verify Gen AI Playground functionality',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@Playground'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping test - Gen AI is RHOAI-specific and not available on ODH.');
        return;
      }

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Gen AI Playground');
      genAiPlayground.navigate(projectName);

      cy.step('Click Create playground button');
      genAiPlayground.findEmptyState().should('exist');
      genAiPlayground.findCreatePlaygroundButton().should('be.visible').click();

      cy.step('Ensure model is selected in the configuration table');
      genAiPlayground.findConfigurationTable().should('be.visible');
      genAiPlayground.ensureModelCheckboxIsChecked(testData.modelDeploymentName);

      cy.step('Click Create button in the modal');
      genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();

      cy.step('Wait for llama-stack-config ConfigMap to be created');
      waitForResource('configmap', 'llama-stack-config', projectName);

      cy.step('Wait for LlamaStackDistribution to be ready');
      checkLlamaStackDistributionReady(projectName);

      cy.step('Wait for playground service to be created');
      waitForResource('service', 'lsd-genai-playground-service', projectName);

      cy.step('Navigate to playground URL');
      genAiPlayground.navigate(projectName);

      cy.step(`Select ${testData.modelDeploymentName} model from dropdown`);
      genAiPlayground.selectModelFromDropdown(testData.modelDeploymentName);

      cy.step(`Verify ${testData.modelDeploymentName} model is selected`);
      genAiPlayground.verifyModelIsSelected(testData.modelDeploymentName);

      cy.step('Verify message input is ready and functional');
      genAiPlayground.findMessageInput().should('be.enabled').and('be.visible');

      cy.step('Send a test message to verify chatbot interface is working');
      genAiPlayground.sendMessage(testData.testMessage);

      cy.step('Verify user message appears in chat');
      genAiPlayground.findUserMessage().should('exist').and('contain', testData.testMessage);

      cy.step(
        'Verify playground is functional (model inference not tested due to slow response time)',
      );
      cy.log('✅ Playground interface is functional and ready to receive messages');
    },
  );
});
