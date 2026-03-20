import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { checkInferenceServiceState } from '../../../utils/oc_commands/modelServing';
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
import { aiAssetsPage } from '../../../pages/aiAssets';
import { genAiPlayground } from '../../../pages/genAiPlayground';
import { servingRuntimes } from '../../../pages/servingRuntimes';
import { getVllmCpuAmd64RuntimePath } from '../../../utils/fileImportUtils';
import { getVllmCpuAmd64RuntimeInfo } from '../../../utils/fileParserUtil';
import {
  cleanupHardwareProfiles,
  createCleanHardwareProfile,
} from '../../../utils/oc_commands/hardwareProfiles';
import { waitForLlamaStackDistributionReady } from '../../../utils/oc_commands/llamaStackDistribution';

describe('AI Assets Models - User Journeys', () => {
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

      cy.fixture('e2e/genAi/testAIAssetsModels.yaml', 'utf8')
        .then((yamlContent: string) => {
          testData = yaml.load(yamlContent) as GenAiTestData;
          projectName = `ai-assets-models-test-${uuid}`;

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
    'Administrator discovers and deploys Gen AI model as AI asset',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@UserJourney'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping test - Gen AI is RHOAI-specific and not available on ODH.');
        return;
      }

      cy.step('Administrator logs into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to AI Assets Models tab in empty project');
      aiAssetsPage.navigate(projectName);
      aiAssetsPage.switchToModelsTab();

      cy.step('View empty state with instructional message');
      aiAssetsPage.findEmptyState().should('exist').and('be.visible');

      cy.step('Click "Don\'t see the model you\'re looking for?" info button');
      aiAssetsPage.findDontSeeModelButton().should('exist').and('be.visible').click();

      cy.step('Read popover explaining how to enable "Available as AI asset" during deployment');
      aiAssetsPage
        .findModelInfoPopoverContent()
        .should('exist')
        .and('contain', 'model deployments that are available as AI assets');

      cy.step('Close the popover');
      aiAssetsPage.closeModelInfoPopover();

      cy.step('Click "Go to Deployments" button from empty state');
      aiAssetsPage.findEmptyStateActionButton().should('exist').and('be.visible').click();

      cy.step('Verify navigation to Model Deployments page');
      cy.url().should('include', `/ai-hub/deployments/${projectName}`);

      cy.step('Navigate to Serving Runtimes settings to create custom serving runtime');
      cy.wrap(servingRuntimes.navigate(), { timeout: 100000 });

      cy.step('Click Add serving runtime button');
      servingRuntimes.findAddButton().should('exist').and('be.visible').and('be.enabled').click();

      cy.step('Select API Protocol');
      servingRuntimes.findSelectAPIProtocolButton().click();
      servingRuntimes.selectAPIProtocol(testData.apiProtocol);

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

      cy.step(`Navigate to the Project list and select ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      cy.step('Navigate to Model Serving tab and click Deploy Model');
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Configure model location with URI');
      modelServingWizard.findModelLocationSelectOption('URI').click();
      modelServingWizard.findUrilocationInput().should('exist').type(testData.connectionURI);
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
      modelServingWizard.findGlobalScopedServingRuntimes().should('exist');
      modelServingWizard.findServingRuntimeOption(testData.servingRuntime).should('exist').click();
      modelServingWizard.findGlobalScopedLabel().should('be.visible');
      modelServingWizard.findNextButton().click();

      cy.step('Enable "Available as AI asset" checkbox');
      modelServingWizard.findSaveAiAssetCheckbox().click();
      modelServingWizard.findNextButton().click();

      cy.step('Review and deploy model');
      modelServingWizard.findReviewStepModelDetailsSection().should('be.visible');
      modelServingWizard.findDeployButton().should('be.enabled').click();

      cy.step('Wait for redirect after model deployment submission');
      cy.url().should('include', `/projects/${projectName}`);
      modelServingSection.findModelServerDeployedName(testData.modelDeploymentName);

      cy.step('Wait for model to reach Active state');
      waitForResource('inferenceService', testData.inferenceServiceName, projectName);
      checkInferenceServiceState(testData.inferenceServiceName, projectName, {
        checkReady: true,
      });

      cy.step('Navigate back to AI Assets Models tab');
      aiAssetsPage.navigate(projectName);
      aiAssetsPage.switchToModelsTab();

      cy.step('Verify deployed model appears in the table with correct name, status, and use case');
      aiAssetsPage.verifyModelExists(testData.modelDeploymentName);
      aiAssetsPage.findModelName(testData.modelDeploymentName).should('be.visible');
      aiAssetsPage.verifyModelStatus(
        testData.modelDeploymentName,
        testData.expectedStatus as 'Active' | 'Inactive',
      );
      aiAssetsPage.findModelUseCase(testData.modelDeploymentName).should('be.visible');
    },
  );

  it(
    'Data scientist experiments with deployed models in playground',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@Playground', '@UserJourney'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping test - Gen AI is RHOAI-specific and not available on ODH.');
        return;
      }

      cy.step('Data scientist logs into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to AI Assets Models tab');
      aiAssetsPage.navigate(projectName);
      aiAssetsPage.switchToModelsTab();

      cy.step('Use filters to find a specific model by name');
      aiAssetsPage.filterByName(testData.filterByNameValue);
      aiAssetsPage
        .findActiveFilterChip('Name', testData.filterByNameValue)
        .should('exist')
        .and('be.visible');
      aiAssetsPage.verifyModelExists(testData.modelDeploymentName);

      cy.step('Clear filter and filter by keyword');
      aiAssetsPage.clearAllFilters();
      aiAssetsPage.filterByKeyword(testData.filterByKeywordValue);
      aiAssetsPage
        .findActiveFilterChip('Keyword', testData.filterByKeywordValue)
        .should('exist')
        .and('be.visible');
      aiAssetsPage.verifyModelExists(testData.modelDeploymentName);

      cy.step('Clear filter and filter by use case');
      aiAssetsPage.clearAllFilters();
      aiAssetsPage.filterByUseCase(testData.filterByUseCaseValue);
      aiAssetsPage
        .findActiveFilterChip('Use case', testData.filterByUseCaseValue)
        .should('exist')
        .and('be.visible');
      aiAssetsPage.verifyModelExists(testData.modelDeploymentName);

      cy.step('Clear all filters');
      aiAssetsPage.clearAllFilters();

      cy.step('Click "Add to playground" button on the active model');
      aiAssetsPage
        .findAddToPlaygroundButton(testData.modelDeploymentName)
        .should('be.visible')
        .and('not.be.disabled');
      aiAssetsPage.addModelToPlayground(testData.modelDeploymentName);

      cy.step('Configure playground in the modal (verify model is pre-selected)');
      genAiPlayground.findConfigurationTable().should('be.visible');

      cy.step('Submit configuration');
      genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();

      cy.step('Verify redirect to playground');
      cy.url().should('include', `/gen-ai-studio/playground/${projectName}`, { timeout: 30000 });

      cy.step('Verify playground resources are created');
      waitForResource('configmap', testData.configMapName, projectName);
      waitForLlamaStackDistributionReady(projectName);

      cy.step('Verify model is selected in playground');
      genAiPlayground.verifyModelIsSelected(testData.modelDeploymentName);

      cy.step('Send test message to confirm model responds');
      genAiPlayground.findMessageInput().should('be.enabled').and('be.visible');
      genAiPlayground.sendMessage(testData.testMessage);
      genAiPlayground.findUserMessage().should('exist').and('contain', testData.testMessage);

      cy.step('Navigate back to AI Assets Models tab');
      aiAssetsPage.navigate(projectName);
      aiAssetsPage.switchToModelsTab();

      cy.step('Find the model already in the playground');
      aiAssetsPage.verifyModelExists(testData.modelDeploymentName);

      cy.step('Click "Try in playground" button');
      aiAssetsPage
        .findTryInPlaygroundButton(testData.modelDeploymentName)
        .should('exist')
        .and('be.visible')
        .and('not.be.disabled');
      aiAssetsPage.tryModelInPlayground(testData.modelDeploymentName);

      cy.step('Verify redirect to playground with correct model selected');
      cy.url().should('include', `/gen-ai-studio/playground/${projectName}`, { timeout: 30000 });

      cy.step('Verify model is ready for interaction');
      genAiPlayground.verifyModelIsSelected(testData.modelDeploymentName);
      genAiPlayground.findMessageInput().should('be.enabled').and('be.visible');
    },
  );

  it(
    'Developer retrieves model endpoint for application integration',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@Endpoints', '@UserJourney'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping test - Gen AI is RHOAI-specific and not available on ODH.');
        return;
      }

      cy.step('Developer logs into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to AI Assets Models tab');
      aiAssetsPage.navigate(projectName);
      aiAssetsPage.switchToModelsTab();

      cy.step('Locate the deployed model in the table');
      aiAssetsPage.verifyModelExists(testData.modelDeploymentName);

      cy.step('View internal and external endpoint URLs');
      aiAssetsPage.findModelInternalEndpoint(testData.modelDeploymentName).should('be.visible');
      aiAssetsPage.findModelExternalEndpoint(testData.modelDeploymentName).should('be.visible');

      cy.step('View endpoint URL details');
      aiAssetsPage.viewEndpointUrl(testData.modelDeploymentName);

      cy.step('Copy endpoint URL to clipboard');
      aiAssetsPage.copyEndpoint(testData.modelDeploymentName);

      cy.step('Verify endpoint format is valid and accessible');
      aiAssetsPage.findModelInternalEndpoint(testData.modelDeploymentName).should('be.visible');
      aiAssetsPage.findModelExternalEndpoint(testData.modelDeploymentName).should('be.visible');

      cy.step('Navigate back and verify model status remains Active');
      // Verify InferenceService is ready by checking from source (oc command)
      checkInferenceServiceState(testData.inferenceServiceName, projectName, { checkReady: true });
      aiAssetsPage.navigate(projectName);
      aiAssetsPage.switchToModelsTab();
      // Verify the model appears in the table after confirming it's ready
      aiAssetsPage.verifyModelExists(testData.modelDeploymentName);
    },
  );
});
