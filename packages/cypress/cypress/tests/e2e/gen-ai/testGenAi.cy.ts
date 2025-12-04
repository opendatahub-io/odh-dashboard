import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  verifyOpenShiftProjectExists,
  deleteOpenShiftProject,
} from '../../../utils/oc_commands/project';
import { checkInferenceServiceState } from '../../../utils/oc_commands/modelServing';
import { checkLlamaStackDistributionReady } from '../../../utils/oc_commands/llamaStackDistribution';
import { waitForResource } from '../../../utils/oc_commands/baseCommands';
import { enableGenAiFeatures, disableGenAiFeatures } from '../../../utils/oc_commands/genAi';
import { getCustomResource } from '../../../utils/oc_commands/customResources';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { GenAiTestData } from '../../../types';
import { projectDetails, projectListPage, createProjectModal } from '../../../pages/projects';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
} from '../../../pages/modelServing';
import { genAiPlayground } from '../../../pages/genAiPlayground';
import { servingRuntimes } from '../../../pages/servingRuntimes';
import { getVllmCpuAmd64RuntimePath } from '../../../utils/fileImportUtils';
import { getVllmCpuAmd64RuntimeInfo } from '../../../utils/fileParserUtil';
import { cleanupTemplates } from '../../../utils/oc_commands/templates';

describe('Verify Gen AI Namespace - Creation and Connection', () => {
  let testData: GenAiTestData;
  let projectName: string;
  let skipTest = false;
  const uuid = generateTestUUID();

  // Serving runtime variables
  let servingRuntimeName: string;
  let servingRuntimeDisplayName: string;

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
        .then(() => enableGenAiFeatures())
        .then(() => getVllmCpuAmd64RuntimeInfo())
        .then((info) => {
          servingRuntimeName = info.singleModelServingName;
          servingRuntimeDisplayName = info.displayName;
          cy.log(`Loaded Serving Runtime Name: ${servingRuntimeName}`);
          cy.log(`Loaded Serving Runtime Display Name: ${servingRuntimeDisplayName}`);
          return cleanupTemplates(servingRuntimeDisplayName);
        });
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

    // Cleanup serving runtime template
    if (servingRuntimeDisplayName) {
      cleanupTemplates(servingRuntimeDisplayName);
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
    'Create custom serving runtime for Gen AI',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@ServingRuntime'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping test - Gen AI is RHOAI-specific and not available on ODH.');
        return;
      }

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Serving Runtimes settings');
      cy.wrap(servingRuntimes.navigate(), { timeout: 100000 });

      cy.step('Click Add serving runtime button');
      servingRuntimes.findAddButton().should('exist').and('be.visible').and('be.enabled').click();

      cy.step('Select API Protocol');
      servingRuntimes.findSelectAPIProtocolButton().click();
      servingRuntimes.selectAPIProtocol('REST');

      cy.step('Select Generative AI Model Type');
      servingRuntimes.findSelectModelTypes().click();
      servingRuntimes.findGenerativeAIModelOption().click();

      cy.step('Upload serving runtime YAML file');
      const servingRuntimeYaml = getVllmCpuAmd64RuntimePath();
      servingRuntimes.uploadYaml(servingRuntimeYaml);

      cy.step('Submit and verify serving runtime creation');
      servingRuntimes
        .findSubmitButton()
        .should('be.enabled')
        .click()
        .then(() => {
          cy.url().should('include', '/settings/model-resources-operations/serving-runtimes', {
            timeout: 30000,
          });
        });

      cy.step(`Verify serving runtime ${servingRuntimeName} was created`);
      cy.contains(servingRuntimeDisplayName).should('be.visible');
      servingRuntimes.getRowById(servingRuntimeName).find().should('exist');
    },
  );

  it(
    'Create namespace for test',
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
    },
  );

  it(
    'Deploy Gen AI model using URI',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@ModelServing', '@Deployment'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping test - Gen AI is RHOAI-specific and not available on ODH.');
        return;
      }

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      cy.step('Navigate to Model Serving tab and click Deploy Model');
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Step 1: Model details - Configure model location');
      // Select URI as model location and enter the model URI
      modelServingWizard.findModelLocationSelectOption('URI').click();
      modelServingWizard.findUrilocationInput().should('exist').type(testData.connectionURI);
      // Uncheck "Create a connection to this location" since connection was already created in previous test
      modelServingWizard.findSaveConnectionCheckbox().uncheck();
      modelServingWizard.findModelTypeSelect().should('be.visible').should('not.be.disabled');
      modelServingWizard.findModelTypeSelectOption(testData.modelType).click();
      modelServingWizard.findNextButton().click();

      cy.step('Configure model deployment details');
      modelServingWizard.findModelDeploymentNameInput().clear().type(testData.modelDeploymentName);

      cy.step('Select hardware profile');
      // Handle the case where 'default-profile' is auto-selected and greyed out
      modelServingWizard.findHardwareProfileSelect().then(($dropdown) => {
        if ($dropdown.prop('disabled') || $dropdown.attr('aria-disabled') === 'true') {
          // If disabled, verify the default profile is already selected
          cy.wrap($dropdown).should('contain.text', 'default-profile');
          cy.log(
            'Hardware profile is auto-selected and disabled - default-profile already selected',
          );
        } else {
          // If enabled, proceed with selection
          cy.wrap($dropdown).click();
          modelServingWizard.findHardwareProfileOption('default-profile').click();
        }
      });

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
