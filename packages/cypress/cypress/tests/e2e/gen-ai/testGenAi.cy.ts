import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { checkInferenceServiceState } from '../../../utils/oc_commands/modelServing';
import { checkLlamaStackDistributionReady } from '../../../utils/oc_commands/llamaStackDistribution';
import { waitForResource } from '../../../utils/oc_commands/baseCommands';
import {
  enableGenAiFeatures,
  disableGenAiFeatures,
  cleanupServingRuntimeTemplate,
} from '../../../utils/oc_commands/genAi';
import { getCustomResource } from '../../../utils/oc_commands/customResources';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { GenAiTestData } from '../../../types';
import { projectDetails, projectListPage } from '../../../pages/projects';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  inferenceServiceModal,
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
} from '../../../pages/modelServing';
import { genAiPlayground } from '../../../pages/genAiPlayground';
import { servingRuntimes } from '../../../pages/servingRuntimes';
import { getVllmCpuAmd64RuntimePath } from '../../../utils/fileImportUtils';
import { getVllmCpuAmd64RuntimeInfo } from '../../../utils/fileParserUtil';
import {
  cleanupHardwareProfiles,
  createCleanHardwareProfile,
} from '../../../utils/oc_commands/hardwareProfiles';

describe('[Product Bug: RHOAIENG-41634] Verify Gen AI Namespace - Creation and Connection', () => {
  let testData: GenAiTestData;
  let projectName: string;
  let skipTest = false;
  const uuid = generateTestUUID();

  // Serving runtime variables
  let servingRuntimeName: string;
  let servingRuntimeDisplayName: string;

  // Hardware profile variables
  let hardwareProfileName: string;

  retryableBefore(() => {
    // Ignore module federation loading errors (for clusters without Gen AI modules deployed)
    Cypress.on('uncaught:exception', (err) => {
      // Ignore SyntaxError from missing federated modules
      if (err.message.includes('expected expression') || err.message.includes('Unexpected token')) {
        return false;
      }
      return true;
    });

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

          cy.log(`Creating project ${projectName} using oc commands`);
          return createCleanProject(projectName);
        })
        .then(() => {
          // Create hardware profile for model deployment
          hardwareProfileName = testData.hardwareProfileName;
          cy.log(`Creating Hardware Profile: ${hardwareProfileName}`);
          createCleanHardwareProfile(testData.hardwareProfileResourceYamlPath);
        })
        .then(() => enableGenAiFeatures())
        .then(() => getVllmCpuAmd64RuntimeInfo())
        .then((info) => {
          servingRuntimeName = info.singleModelServingName;
          servingRuntimeDisplayName = info.displayName;
          cy.log(`Loaded Serving Runtime Name: ${servingRuntimeName}`);
          cy.log(`Loaded Serving Runtime Display Name: ${servingRuntimeDisplayName}`);
          return cleanupServingRuntimeTemplate(servingRuntimeName);
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
    if (servingRuntimeName) {
      cleanupServingRuntimeTemplate(servingRuntimeName);
    }

    // Cleanup hardware profile
    if (hardwareProfileName) {
      cy.log(`Cleaning up Hardware Profile: ${hardwareProfileName}`);
      cleanupHardwareProfiles(hardwareProfileName);
    }
  });

  it(
    'Create custom serving runtime for Gen AI',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@ServingRuntime', '@Bug'],
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
    'Deploy Gen AI model using URI',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@ModelServing', '@Deployment', '@Bug'],
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

      cy.step('Model details - Configure model location');
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
      inferenceServiceModal.selectPotentiallyDisabledProfile(
        testData.hardwareProfileDeploymentSize,
        hardwareProfileName,
      );

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
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@Playground', '@Bug'],
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
      waitForResource('configmap', testData.configMapName, projectName);

      cy.step('Wait for LlamaStackDistribution to be ready');
      checkLlamaStackDistributionReady(projectName);

      cy.step('Wait for playground service to be created');
      waitForResource('service', testData.playgroundServiceName, projectName);

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
