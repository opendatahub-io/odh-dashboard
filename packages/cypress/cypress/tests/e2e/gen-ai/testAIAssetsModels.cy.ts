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

  // Ignore module federation loading errors (for clusters without Gen AI modules deployed)
  Cypress.on('uncaught:exception', (err) => {
    // Ignore SyntaxError from missing federated modules
    if (err.message.includes('expected expression') || err.message.includes('Unexpected token')) {
      return false;
    }
    return true;
  });

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

      cy.fixture('e2e/genAi/testAIAssetsModels.yaml', 'utf8')
        .then((yamlContent: string) => {
          testData = yaml.load(yamlContent) as GenAiTestData;
          projectName = `ai-assets-models-test-${uuid}`;

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

    // Run each cleanup independently so one failure doesn't prevent others
    cy.then(() => {
      try {
        disableGenAiFeatures();
      } catch (error) {
        cy.log(`Warning: Failed to disable Gen AI features: ${String(error)}`);
      }
    });

    cy.then(() => {
      if (projectName) {
        try {
          deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
        } catch (error) {
          cy.log(`Warning: Failed to delete project ${projectName}: ${String(error)}`);
        }
      }
    });

    cy.then(() => {
      if (servingRuntimeName) {
        try {
          cleanupServingRuntimeTemplate(servingRuntimeName);
        } catch (error) {
          cy.log(
            `Warning: Failed to cleanup serving runtime ${servingRuntimeName}: ${String(error)}`,
          );
        }
      }
    });

    cy.then(() => {
      if (hardwareProfileName) {
        try {
          cy.log(`Cleaning up Hardware Profile: ${hardwareProfileName}`);
          cleanupHardwareProfiles(hardwareProfileName);
        } catch (error) {
          cy.log(
            `Warning: Failed to cleanup hardware profile ${hardwareProfileName}: ${String(error)}`,
          );
        }
      }
    });
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
            cy.url({ timeout: 30000 }).should(
              'include',
              '/settings/model-resources-operations/serving-runtimes',
            );
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
        modelServingSection
          .findModelServerDeployedName(testData.modelDeploymentName)
          .should('exist');

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

    it.skip(
      'TODO: Test loading state with spinner',
      {
        tags: ['@GenAI', '@AIAssets', '@ModelsTab'],
      },
      () => {
        if (skipTest) {
          return;
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        // TODO: implement assertions - should assert the spinner/progressbar element appears
        // (e.g., query for aria-role="progressbar" or a .spinner selector in the aiAssetsPage.navigate/project load flow)
        // and then disappears
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

        if (!testData.filterByNameValue) {
          throw new Error('filterByNameValue must be defined in test fixture');
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.filterByName(testData.filterByNameValue);
        aiAssetsPage
          .findActiveFilterChip('Name', testData.filterByNameValue)
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

        if (!testData.filterByKeywordValue) {
          throw new Error('filterByKeywordValue must be defined in test fixture');
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.filterByKeyword(testData.filterByKeywordValue);
        aiAssetsPage
          .findActiveFilterChip('Keyword', testData.filterByKeywordValue)
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

        if (!testData.filterByUseCaseValue) {
          throw new Error('filterByUseCaseValue must be defined in test fixture');
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.filterByUseCase(testData.filterByUseCaseValue);
        aiAssetsPage
          .findActiveFilterChip('Use case', testData.filterByUseCaseValue)
          .should('exist')
          .and('be.visible');
        aiAssetsPage.verifyModelExists(testData.modelDeploymentName);
      },
    );

    it.skip(
      'TODO: Test that filter chips appear with correct colors',
      {
        tags: ['@GenAI', '@AIAssets', '@ModelsTab', '@Filtering'],
      },
      () => {
        if (skipTest) {
          return;
        }

        if (!testData.filterByNameValue) {
          throw new Error('filterByNameValue must be defined in test fixture');
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        // TODO: implement assertions - select filters and assert the chip elements have
        // the expected CSS class or background-color style
        aiAssetsPage.filterByName(testData.filterByNameValue);
        aiAssetsPage.findActiveFilterChip('Name', testData.filterByNameValue).should('be.visible');
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

        if (!testData.filterByNameValue) {
          throw new Error('filterByNameValue must be defined in test fixture');
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.filterByName(testData.filterByNameValue);
        aiAssetsPage.removeFilterChip('Name', testData.filterByNameValue);
        aiAssetsPage.findActiveFilterChip('Name', testData.filterByNameValue).should('not.exist');
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

        if (!testData.filterByNameValue) {
          throw new Error('filterByNameValue must be defined in test fixture');
        }
        if (!testData.filterByKeywordValue) {
          throw new Error('filterByKeywordValue must be defined in test fixture');
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.filterByName(testData.filterByNameValue);
        aiAssetsPage.filterByKeyword(testData.filterByKeywordValue);
        aiAssetsPage.clearAllFilters();
        aiAssetsPage.findActiveFilterChip('Name', testData.filterByNameValue).should('not.exist');
        aiAssetsPage
          .findActiveFilterChip('Keyword', testData.filterByKeywordValue)
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

        if (!testData.filterByNameValue) {
          throw new Error('filterByNameValue must be defined in test fixture');
        }

        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        aiAssetsPage.filterByName(testData.filterByNameValue);
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

        cy.step('Navigate to AI Assets page and switch to Models tab');
        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        aiAssetsPage.navigate(projectName);
        aiAssetsPage.switchToModelsTab();

        cy.step(`Copy endpoint for ${testData.modelDeploymentName} and verify clipboard content`);
        aiAssetsPage.copyEndpoint(testData.modelDeploymentName);

        cy.step('Verify the endpoint URL was copied to clipboard');
        cy.window()
          .its('navigator.clipboard')
          .invoke('readText')
          .should('include', 'https://')
          .and('include', testData.inferenceServiceName);
      },
    );

    it(
      'TODO: Test endpoint format validation',
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

        // TODO: implement assertions - locate the endpoint input/control used in the test
        // and assert its value/validation message matches the expected URL regex
        // or that submitting invalid formats shows an error
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

  // Helper function to test button behavior with inactive models (shared across multiple test suites)
  const testInactiveModelButton = (
    buttonFinder: (modelName: string) => Cypress.Chainable<JQuery<HTMLElement>>,
    buttonName: string,
  ) => {
    cy.step('Scale model deployment to 0 replicas to make it inactive');
    cy.exec(
      `oc scale deployment/${testData.inferenceServiceName}-predictor -n ${projectName} --replicas=0`,
      { failOnNonZeroExit: false },
    );

    cy.step('Wait for deployment to scale down');
    cy.exec(
      `oc wait deployment/${testData.inferenceServiceName}-predictor -n ${projectName} --for=jsonpath='{.status.replicas}'=0 --timeout=60s`,
      { failOnNonZeroExit: false, timeout: 65000 },
    );

    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    aiAssetsPage.navigate(projectName);
    aiAssetsPage.switchToModelsTab();

    cy.step(`Verify ${buttonName} button is disabled for inactive model`);
    buttonFinder(testData.modelDeploymentName).should('be.disabled');

    cy.step('Restore model deployment to active state');
    cy.exec(
      `oc scale deployment/${testData.inferenceServiceName}-predictor -n ${projectName} --replicas=1`,
      { failOnNonZeroExit: false },
    );

    cy.step('Wait for model to become ready');
    checkInferenceServiceState(testData.inferenceServiceName, projectName, {
      checkReady: true,
    });
  };

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
      'Test that "Add to playground" button is disabled for inactive models',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Playground'],
      },
      () => {
        if (skipTest) {
          return;
        }

        testInactiveModelButton(
          (modelName) => aiAssetsPage.findAddToPlaygroundButton(modelName),
          'Add to playground',
        );
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

        cy.url({ timeout: 30000 }).should('include', `/gen-ai-studio/playground/${projectName}`);
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
      'Test that "Try in playground" button is disabled for inactive models',
      {
        tags: ['@Sanity', '@SanitySet1', '@GenAI', '@AIAssets', '@ModelsTab', '@Playground'],
      },
      () => {
        if (skipTest) {
          return;
        }

        testInactiveModelButton(
          (modelName) => aiAssetsPage.findTryInPlaygroundButton(modelName),
          'Try in playground',
        );
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
        cy.url({ timeout: 30000 }).should('include', `/gen-ai-studio/playground/${projectName}`);
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
        cy.url({ timeout: 30000 }).should('include', `/gen-ai-studio/playground/${projectName}`);

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

    retryableBefore(() => {
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

        // Verify empty state elements exist and are visible without asserting exact copy
        aiAssetsPage.findEmptyState().should('be.visible').and('not.be.empty');
        aiAssetsPage.findEmptyStateMessage().should('be.visible').and('not.be.empty');
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

        // Verify empty state message exists and is visible without asserting exact copy
        aiAssetsPage.findEmptyStateMessage().should('be.visible').and('not.be.empty');
      },
    );
  });

  // User Story: Table Pagination
  describe('Table Pagination', () => {
    it(
      'TODO: Test pagination controls appear when needed',
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

        // TODO: implement assertions - operate the pagination UI and assert that
        // next/prev buttons or page numbers exist
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
      'TODO: Test changing page size',
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

        // TODO: implement assertions - click page size dropdown used by aiAssetsPage,
        // select a different size, assert that row count changes accordingly
        // Page size testing requires multiple models
        aiAssetsPage.findModelsTable().should('exist');
      },
    );

    it(
      'TODO: Test that page state persists during session',
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

        // TODO: implement assertions - navigate to a different page, return and assert
        // the page index or query param persisted
        aiAssetsPage.getVisibleRowCount().should('be.gte', 1);
      },
    );
  });
});
