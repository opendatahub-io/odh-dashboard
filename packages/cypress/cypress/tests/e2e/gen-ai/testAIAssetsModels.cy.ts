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
import { servingRuntimes } from '../../../pages/servingRuntimes';
import { getVllmCpuAmd64RuntimePath } from '../../../utils/fileImportUtils';
import { getVllmCpuAmd64RuntimeInfo } from '../../../utils/fileParserUtil';
import {
  cleanupHardwareProfiles,
  createCleanHardwareProfile,
} from '../../../utils/oc_commands/hardwareProfiles';

describe('Verify AI Assets - Models Tab', () => {
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
    'Setup - Create custom serving runtime for Gen AI',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@ServingRuntime', '@AIAssets'],
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
    'Setup - Deploy Gen AI model as AI asset',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@ModelServing', '@Deployment', '@AIAssets'],
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
    'User Story 1: View AI Models - Verify models table loads and displays model information',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping test - Gen AI is RHOAI-specific and not available on ODH.');
        return;
      }

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to AI Assets page');
      aiAssetsPage.navigate(projectName);

      cy.step('Verify Models tab exists and is accessible');
      aiAssetsPage.findModelsTab().should('exist').and('be.visible');

      cy.step('Switch to Models tab');
      aiAssetsPage.switchToModelsTab();

      cy.step('Verify models table is displayed');
      aiAssetsPage.findModelsTable().should('exist').and('be.visible');

      cy.step('Verify deployed model appears in the table');
      aiAssetsPage.verifyModelExists(testData.modelDeploymentName);

      cy.step('Verify model columns are displayed correctly');
      aiAssetsPage.findModelName(testData.modelDeploymentName).should('be.visible');
      aiAssetsPage.findModelInternalEndpoint(testData.modelDeploymentName).should('be.visible');
      aiAssetsPage.findModelExternalEndpoint(testData.modelDeploymentName).should('be.visible');
      aiAssetsPage.findModelUseCase(testData.modelDeploymentName).should('be.visible');
      aiAssetsPage.findModelStatus(testData.modelDeploymentName).should('be.visible');
      aiAssetsPage.findModelPlaygroundActions(testData.modelDeploymentName).should('be.visible');

      cy.step('Verify model status badge shows Active');
      aiAssetsPage.verifyModelStatus(testData.modelDeploymentName, 'Active');
    },
  );

  it(
    'User Story 1: View AI Models - Verify empty state when no models are available',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping test - Gen AI is RHOAI-specific and not available on ODH.');
        return;
      }

      const emptyProjectName = `ai-assets-empty-test-${uuid}`;

      cy.step(`Create empty project ${emptyProjectName}`);
      createCleanProject(emptyProjectName);

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to AI Assets page for empty project');
      aiAssetsPage.navigate(emptyProjectName);

      cy.step('Switch to Models tab');
      aiAssetsPage.switchToModelsTab();

      cy.step('Verify empty state is displayed');
      aiAssetsPage.findEmptyState().should('exist').and('be.visible');

      cy.step('Verify empty state title');
      aiAssetsPage.findEmptyState().should('contain', 'To begin you must deploy a model');

      cy.step('Verify empty state description provides instructions');
      aiAssetsPage
        .findEmptyStateMessage()
        .should('contain', 'Model Deployments')
        .and('contain', 'Make this deployment available as an AI asset');

      cy.step('Verify "Go to Deployments" button exists');
      aiAssetsPage.findEmptyStateActionButton().should('exist').and('be.visible');

      cy.step('Cleanup empty project');
      deleteOpenShiftProject(emptyProjectName, { wait: false, ignoreNotFound: true });
    },
  );

  it(
    'User Story 2: Filtering and Searching Models - Filter by name, keyword, and use case',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Filtering'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping test - Gen AI is RHOAI-specific and not available on ODH.');
        return;
      }

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to AI Assets Models tab');
      aiAssetsPage.navigate(projectName);
      aiAssetsPage.switchToModelsTab();

      cy.step('Verify toolbar is displayed');
      aiAssetsPage.findModelsTableToolbar().should('exist').and('be.visible');

      cy.step('Test filter by name');
      aiAssetsPage.filterByName(testData.filterByNameValue);
      aiAssetsPage
        .findActiveFilterChip('Name', testData.filterByNameValue)
        .should('exist')
        .and('be.visible');
      aiAssetsPage.verifyModelExists(testData.modelDeploymentName);

      cy.step('Clear name filter using chip close button');
      aiAssetsPage.removeFilterChip('Name', testData.filterByNameValue);
      aiAssetsPage.findActiveFilterChip('Name', testData.filterByNameValue).should('not.exist');

      cy.step('Test filter by keyword');
      aiAssetsPage.filterByKeyword(testData.filterByKeywordValue);
      aiAssetsPage
        .findActiveFilterChip('Keyword', testData.filterByKeywordValue)
        .should('exist')
        .and('be.visible');
      aiAssetsPage.verifyModelExists(testData.modelDeploymentName);

      cy.step('Test clear all filters');
      aiAssetsPage.clearAllFilters();
      aiAssetsPage
        .findActiveFilterChip('Keyword', testData.filterByKeywordValue)
        .should('not.exist');

      cy.step('Test filter by use case');
      aiAssetsPage.filterByUseCase(testData.filterByUseCaseValue);
      aiAssetsPage
        .findActiveFilterChip('Use case', testData.filterByUseCaseValue)
        .should('exist')
        .and('be.visible');
      aiAssetsPage.verifyModelExists(testData.modelDeploymentName);

      cy.step('Test empty results when filter does not match');
      aiAssetsPage.filterByName('nonexistent-model-name');
      aiAssetsPage.verifyModelDoesNotExist(testData.modelDeploymentName);

      cy.step('Clear filters to restore original view');
      aiAssetsPage.clearAllFilters();
      aiAssetsPage.verifyModelExists(testData.modelDeploymentName);
    },
  );

  it(
    'User Story 3: Model Endpoints - View and copy model endpoints',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Endpoints'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping test - Gen AI is RHOAI-specific and not available on ODH.');
        return;
      }

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to AI Assets Models tab');
      aiAssetsPage.navigate(projectName);
      aiAssetsPage.switchToModelsTab();

      cy.step('Verify internal endpoint is displayed');
      aiAssetsPage.findModelInternalEndpoint(testData.modelDeploymentName).should('be.visible');

      cy.step('Verify external endpoint is displayed');
      aiAssetsPage.findModelExternalEndpoint(testData.modelDeploymentName).should('be.visible');

      cy.step('Test viewing endpoint URL');
      aiAssetsPage.viewEndpointUrl(testData.modelDeploymentName);

      cy.step('Test copying endpoint to clipboard');
      aiAssetsPage.copyEndpoint(testData.modelDeploymentName);
      cy.log('Endpoint copy button clicked successfully');

      cy.step('Test copying token to clipboard');
      aiAssetsPage.copyToken(testData.modelDeploymentName);
      cy.log('Token copy button clicked successfully');
    },
  );

  it(
    'User Story 4 & 5: Adding and Trying Models in Playground',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Playground'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping test - Gen AI is RHOAI-specific and not available on ODH.');
        return;
      }

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to AI Assets Models tab');
      aiAssetsPage.navigate(projectName);
      aiAssetsPage.switchToModelsTab();

      cy.step('Verify Add to playground button is visible for model');
      aiAssetsPage
        .findAddToPlaygroundButton(testData.modelDeploymentName)
        .should('exist')
        .and('be.visible')
        .and('not.be.disabled');

      cy.step('Click Add to playground button');
      aiAssetsPage.addModelToPlayground(testData.modelDeploymentName);

      cy.step('Verify configuration modal opens');
      cy.findByTestId('modal-submit-button').should('exist').and('be.visible');

      cy.step('Verify model is pre-selected in configuration modal');
      cy.findByTestId('chatbot-configuration-table').should('be.visible');

      cy.step('Create playground with the selected model');
      cy.findByTestId('modal-submit-button').should('be.enabled').click();

      cy.step('Wait for redirect to playground after successful addition');
      cy.url().should('include', `/gen-ai-studio/playground/${projectName}`, { timeout: 30000 });
    },
  );

  it(
    'User Story 6: Model Information Popover - Understanding AI assets',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@InfoPopover'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping test - Gen AI is RHOAI-specific and not available on ODH.');
        return;
      }

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to AI Assets Models tab');
      aiAssetsPage.navigate(projectName);
      aiAssetsPage.switchToModelsTab();

      cy.step('Verify "Don\'t see the model you\'re looking for?" button exists');
      aiAssetsPage.findDontSeeModelButton().should('exist').and('be.visible');

      cy.step('Click the info button to open popover');
      aiAssetsPage.openModelInfoPopover();

      cy.step('Verify popover opens with information');
      aiAssetsPage.findModelInfoPopoverContent().should('exist');

      cy.step('Verify popover explains how to make deployments available as AI assets');
      aiAssetsPage
        .findModelInfoPopoverContent()
        .should('contain', 'model deployments that are available as AI assets')
        .and('contain', 'Model deployments');

      cy.step('Close the popover');
      aiAssetsPage.closeModelInfoPopover();
    },
  );
});
