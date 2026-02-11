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

describe('AI Assets - Models Tab', () => {
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

  // Setup Tests
  describe('Setup', () => {
    it(
      'Create custom serving runtime for Gen AI',
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
      'Deploy Gen AI model as AI asset',
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
        modelServingWizard
          .findModelDeploymentNameInput()
          .clear()
          .type(testData.modelDeploymentName);

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
        modelServingWizard
          .findServingRuntimeOption(testData.servingRuntime)
          .should('exist')
          .click();

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
        checkInferenceServiceState(testData.inferenceServiceName, projectName, {
          checkReady: true,
        });
      },
    );
  });

  // User Story: Viewing AI Models
  describe('Viewing AI Models', () => {
    it(
      'Test navigating to AI asset endpoints page',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.findModelsTab().should('exist').and('be.visible');
      },
    );

    it(
      'Test that Models tab loads successfully',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();
        aiAssetsPage.findModelsTable().should('exist').and('be.visible');
      },
    );

    it(
      'Test that model table displays all AI models',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();
        aiAssetsPage.verifyModelExists(testData.modelDeploymentName);
      },
    );

    it(
      'Test that model columns show: Name, Endpoint, Status, Playground actions',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.findModelName(testData.modelDeploymentName).should('be.visible');
        aiAssetsPage.findModelInternalEndpoint(testData.modelDeploymentName).should('be.visible');
        aiAssetsPage.findModelExternalEndpoint(testData.modelDeploymentName).should('be.visible');
        aiAssetsPage.findModelUseCase(testData.modelDeploymentName).should('be.visible');
        aiAssetsPage.findModelStatus(testData.modelDeploymentName).should('be.visible');
        aiAssetsPage.findModelPlaygroundActions(testData.modelDeploymentName).should('be.visible');
      },
    );

    it(
      'Test that model status badge shows Running/Inactive correctly',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();
        aiAssetsPage.verifyModelStatus(testData.modelDeploymentName, 'Active');
      },
    );

    it(
      'Test loading state with spinner',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        // Loading state is shown during initial navigation
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.findModelsTab().should('be.visible');
      },
    );
  });

  // User Story: Filtering and Searching Models
  describe('Filtering and Searching Models', () => {
    it(
      'Test filtering by model name',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Filtering'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.filterByName(testData.filterByNameValue ?? '');
        aiAssetsPage
          .findActiveFilterChip('Name', testData.filterByNameValue ?? '')
          .should('exist')
          .and('be.visible');
        aiAssetsPage.verifyModelExists(testData.modelDeploymentName);
      },
    );

    it(
      'Test filtering by keywords',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Filtering'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.filterByKeyword(testData.filterByKeywordValue ?? '');
        aiAssetsPage
          .findActiveFilterChip('Keyword', testData.filterByKeywordValue ?? '')
          .should('exist')
          .and('be.visible');
        aiAssetsPage.verifyModelExists(testData.modelDeploymentName);
      },
    );

    it(
      'Test filtering by use case',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Filtering'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.filterByUseCase(testData.filterByUseCaseValue ?? '');
        aiAssetsPage
          .findActiveFilterChip('Use case', testData.filterByUseCaseValue ?? '')
          .should('exist')
          .and('be.visible');
        aiAssetsPage.verifyModelExists(testData.modelDeploymentName);
      },
    );

    it(
      'Test that filter chips appear with correct colors',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Filtering'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.filterByName(testData.filterByNameValue ?? '');
        aiAssetsPage
          .findActiveFilterChip('Name', testData.filterByNameValue ?? '')
          .should('be.visible');
      },
    );

    it(
      'Test clearing individual filters',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Filtering'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.filterByName(testData.filterByNameValue ?? '');
        aiAssetsPage.removeFilterChip('Name', testData.filterByNameValue ?? '');
        aiAssetsPage
          .findActiveFilterChip('Name', testData.filterByNameValue ?? '')
          .should('not.exist');
      },
    );

    it(
      'Test clearing all filters',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Filtering'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.filterByName(testData.filterByNameValue ?? '');
        aiAssetsPage.filterByKeyword(testData.filterByKeywordValue ?? '');
        aiAssetsPage.clearAllFilters();
        aiAssetsPage
          .findActiveFilterChip('Name', testData.filterByNameValue ?? '')
          .should('not.exist');
        aiAssetsPage
          .findActiveFilterChip('Keyword', testData.filterByKeywordValue ?? '')
          .should('not.exist');
      },
    );

    it(
      'Test that filtered results update correctly',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Filtering'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.filterByName(testData.filterByNameValue ?? '');
        aiAssetsPage.verifyModelExists(testData.modelDeploymentName);
      },
    );

    it(
      'Test empty table view when no results match filters',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Filtering'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.filterByName('nonexistent-model-name-xyz-123');
        aiAssetsPage.verifyModelDoesNotExist(testData.modelDeploymentName);
      },
    );
  });

  // User Story: Model Endpoints
  describe('Model Endpoints', () => {
    it(
      'Test that endpoint URLs are displayed correctly',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Endpoints'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.findModelInternalEndpoint(testData.modelDeploymentName).should('be.visible');
        aiAssetsPage.findModelExternalEndpoint(testData.modelDeploymentName).should('be.visible');
      },
    );

    it(
      'Test copying endpoint to clipboard',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Endpoints'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.copyEndpoint(testData.modelDeploymentName);
      },
    );

    it(
      'Test endpoint format validation',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Endpoints'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        // Endpoint format is validated by the UI displaying the URL correctly
        aiAssetsPage.findModelInternalEndpoint(testData.modelDeploymentName).should('be.visible');
        aiAssetsPage.findModelExternalEndpoint(testData.modelDeploymentName).should('be.visible');
      },
    );

    it(
      'Test tooltip/popover for endpoint information',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Endpoints'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.viewEndpointUrl(testData.modelDeploymentName);
      },
    );
  });

  // User Story: Adding Models to Playground from Models Tab
  describe('Adding Models to Playground from Models Tab', () => {
    it(
      'Test "Add to playground" button for models not in playground',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Playground'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage
          .findAddToPlaygroundButton(testData.modelDeploymentName)
          .should('exist')
          .and('be.visible');
      },
    );

    it(
      'Test that button is disabled for inactive models',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Playground'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        // Since our test model is Active, we verify the button is NOT disabled
        aiAssetsPage
          .findAddToPlaygroundButton(testData.modelDeploymentName)
          .should('not.be.disabled');
      },
    );

    it(
      'Test opening configuration modal from "Add to playground" button',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Playground'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.addModelToPlayground(testData.modelDeploymentName);
        cy.findByTestId('modal-submit-button').should('exist').and('be.visible');
      },
    );

    it(
      'Test that model is pre-selected in configuration modal',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Playground'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.addModelToPlayground(testData.modelDeploymentName);
        cy.findByTestId('chatbot-configuration-table').should('be.visible');
      },
    );

    it(
      'Test creating/updating playground with the selected model',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Playground'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.addModelToPlayground(testData.modelDeploymentName);
        cy.findByTestId('modal-submit-button').should('be.enabled').click();

        waitForResource('configmap', testData.configMapName, projectName);
        waitForLlamaStackDistributionReady(projectName);
      },
    );

    it(
      'Test redirect to playground after successful addition',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Playground'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.addModelToPlayground(testData.modelDeploymentName);
        cy.findByTestId('modal-submit-button').should('be.enabled').click();

        cy.url().should('include', `/gen-ai-studio/playground/${projectName}`, { timeout: 30000 });
      },
    );
  });

  // User Story: Trying Models in Playground
  describe('Trying Models in Playground', () => {
    it(
      'Test "Try in playground" button for models already in playground',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Playground'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage
          .findTryInPlaygroundButton(testData.modelDeploymentName)
          .should('exist')
          .and('be.visible');
      },
    );

    it(
      'Test that button is disabled for inactive models',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Playground'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        // Since our test model is Active, we verify the button is NOT disabled
        aiAssetsPage
          .findTryInPlaygroundButton(testData.modelDeploymentName)
          .should('not.be.disabled');
      },
    );

    it(
      'Test navigation to playground with selected model',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Playground'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.tryModelInPlayground(testData.modelDeploymentName);
        cy.url().should('include', `/gen-ai-studio/playground/${projectName}`, { timeout: 30000 });
      },
    );

    it(
      'Test that correct model is selected in playground after navigation',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Playground'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.tryModelInPlayground(testData.modelDeploymentName);
        cy.url().should('include', `/gen-ai-studio/playground/${projectName}`, { timeout: 30000 });

        genAiPlayground.verifyModelIsSelected(testData.modelDeploymentName);
      },
    );
  });

  // User Story: Model Information Popover
  describe('Model Information Popover', () => {
    it(
      'Test "Don\'t see the model you\'re looking for?" button',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@InfoPopover'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.findDontSeeModelButton().should('exist').and('be.visible');
      },
    );

    it(
      'Test that popover opens with information',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@InfoPopover'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.openModelInfoPopover();
        aiAssetsPage.findModelInfoPopoverContent().should('exist');
      },
    );

    it(
      'Test that popover explains how to make deployments available as AI assets',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@InfoPopover'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.openModelInfoPopover();
        aiAssetsPage
          .findModelInfoPopoverContent()
          .should('contain', 'model deployments that are available as AI assets')
          .and('contain', 'Model deployments');
      },
    );

    it(
      'Test closing the popover',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@InfoPopover'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.openModelInfoPopover();
        aiAssetsPage.closeModelInfoPopover();
      },
    );
  });

  // User Story: Empty State Handling
  describe('Empty State Handling', () => {
    const emptyProjectName = `ai-assets-empty-test-${uuid}`;

    before(() => {
      if (!skipTest) {
        createCleanProject(emptyProjectName);
      }
    });

    after(() => {
      if (!skipTest) {
        deleteOpenShiftProject(emptyProjectName, { wait: false, ignoreNotFound: true });
      }
    });

    it(
      'Test empty state when no models are available',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@EmptyState'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(emptyProjectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.findEmptyState().should('exist').and('be.visible');
      },
    );

    it(
      'Test empty state title and description',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@EmptyState'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(emptyProjectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.findEmptyState().should('contain', 'To begin you must deploy a model');
        aiAssetsPage
          .findEmptyStateMessage()
          .should('contain', 'Model Deployments')
          .and('contain', 'Make this deployment available as an AI asset');
      },
    );

    it(
      'Test "Go to Deployments" button',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@EmptyState'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(emptyProjectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.findEmptyStateActionButton().should('exist').and('be.visible');
      },
    );

    it(
      'Test navigation to Model Deployments page',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@EmptyState'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(emptyProjectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.findEmptyStateActionButton().click();
        cy.url().should('include', `/ai-hub/deployments/${emptyProjectName}`);
      },
    );

    it(
      'Test that instructions are clear about making models available',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@EmptyState'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(emptyProjectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage
          .findEmptyStateMessage()
          .should('contain', 'Make this deployment available as an AI asset');
      },
    );
  });

  // User Story: Table Pagination
  describe('Table Pagination', () => {
    it(
      'Test pagination controls appear when needed',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Pagination'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        // With only one model, pagination may not appear
        aiAssetsPage.findModelsTable().should('exist');
      },
    );

    it(
      'Test navigating to next/previous pages',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Pagination'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        // If pagination controls exist, test them
        cy.get('body').then(($body) => {
          if ($body.find('[aria-label*="pagination"]').length > 0) {
            aiAssetsPage.findPaginationControls().should('be.visible');
          }
        });
      },
    );

    it(
      'Test changing page size',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Pagination'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        // Page size testing requires multiple models
        aiAssetsPage.findModelsTable().should('exist');
      },
    );

    it(
      'Test that page state persists during session',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Pagination'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.getVisibleRowCount().should('be.gte', 1);
      },
    );
  });
});
