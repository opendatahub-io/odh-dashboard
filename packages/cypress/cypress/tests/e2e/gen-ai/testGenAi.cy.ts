import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  deleteOpenShiftProject,
  waitForUserProjectAccess,
} from '../../../utils/oc_commands/project';
import { checkLlamaStackDistributionReady } from '../../../utils/oc_commands/llamaStackDistribution';
import { waitForResource } from '../../../utils/oc_commands/baseCommands';
import { cleanupServingRuntimeTemplate, deployGenAiModel } from '../../../utils/oc_commands/genAi';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { GenAiTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import { genAiPlayground } from '../../../pages/genAiPlayground';
import { getVllmCpuAmd64RuntimeInfo } from '../../../utils/fileParserUtil';
import { cleanupHardwareProfiles } from '../../../utils/oc_commands/hardwareProfiles';

describe('Verify Gen AI Namespace - Creation and Connection', () => {
  let testData: GenAiTestData;
  let projectName: string;

  let servingRuntimeName: string;
  let hardwareProfileName: string;

  retryableBefore(() => {
    Cypress.on('uncaught:exception', (err) => {
      if (err.message.includes('expected expression') || err.message.includes('Unexpected token')) {
        return false;
      }
      return true;
    });

    cy.fixture('e2e/genAi/testGenAi.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as GenAiTestData;
        hardwareProfileName = testData.hardwareProfileName;
      })
      .then(() => getVllmCpuAmd64RuntimeInfo())
      .then((info) => {
        servingRuntimeName = info.singleModelServingName;
        return cleanupServingRuntimeTemplate(servingRuntimeName);
      })
      .then(() => {
        const prefix = testData.projectNamePrefix;
        return cy
          .exec(`oc get projects -o jsonpath='{.items[*].metadata.name}'`, {
            failOnNonZeroExit: false,
          })
          .then((result) => {
            const existing = result.stdout.split(' ').find((name) => name.startsWith(prefix));
            if (existing) {
              projectName = existing;
              cy.log(`Reusing existing project: ${projectName}`);
              return;
            }

            projectName = `${prefix}-${generateTestUUID()}`;
            cy.step(`Create project ${projectName}`);
            createCleanProject(projectName);

            return waitForUserProjectAccess(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME).then(
              () => {
                cy.step('Deploy Gen AI model via oc commands');
                deployGenAiModel(projectName, testData);
              },
            );
          });
      });
  });

  after(() => {
    if (projectName) {
      deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    }

    if (servingRuntimeName) {
      cleanupServingRuntimeTemplate(servingRuntimeName);
    }

    if (hardwareProfileName) {
      cy.log(`Cleaning up Hardware Profile: ${hardwareProfileName}`);
      cleanupHardwareProfiles(hardwareProfileName);
    }
  });

  it(
    'Verify User can send message to Playground',
    {
      tags: [
        '@Tier',
        '@Tier1',
        '@GenAI',
        '@ModelServing',
        '@Deployment',
        '@Playground',
        '@NonConcurrent',
      ],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Serving Runtimes settings');
      cy.wrap(servingRuntimes.navigate(), { timeout: 100000 });

      cy.step('Click Add serving runtime button');
      servingRuntimes.findAddButton().should('exist').and('be.visible').click();

      cy.step('Select API Protocol');
      servingRuntimes.findSelectAPIProtocolButton().click();
      servingRuntimes.selectAPIProtocol(ServingRuntimeAPIProtocol.REST);

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
          cy.url().should('include', testData.servingRuntimesPath, {
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
      tags: ['@Tier', '@Tier1', '@GenAI', '@ModelServing', '@Deployment', '@NonConcurrent'],
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
      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
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
      cy.then(() => {
        checkInferenceServiceState(testData.inferenceServiceName, projectName, {
          checkReady: true,
        });
      });
    },
  );

  it(
    'Create and verify Gen AI Playground functionality',
    {
      tags: ['@Tier', '@Tier1', '@GenAI', '@Playground', '@NonConcurrent'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping test - Gen AI is RHOAI-specific and not available on ODH.');
        return;
      }

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to AI asset endpoints page');
      genAiPlayground.navigateToAssets(projectName);

      cy.step('Click Add to playground button');
      genAiPlayground.findAddToPlaygroundButton().should('be.visible').click();

      cy.step('Ensure model is selected in the configuration table');
      genAiPlayground.findConfigurationTable().should('be.visible');
      genAiPlayground.ensureModelCheckboxIsChecked(testData.modelDeploymentName);

      cy.step('Click Create button in the modal');
      genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();

      cy.step('Wait for llama-stack-config ConfigMap to be created');
      waitForResource('configmap', testData.configMapName, projectName);

      cy.step('Wait for OGXServer to be ready');
      checkLlamaStackDistributionReady(projectName);

      cy.step('Wait for playground service to be created');
      waitForResource('service', testData.playgroundServiceName, projectName);

      cy.step('Navigate to playground');
      genAiPlayground.navigate(projectName);

      cy.step(`Select ${testData.inferenceServiceName} model from dropdown`);
      genAiPlayground.selectModelFromDropdown(testData.inferenceServiceName);

      cy.step(`Verify ${testData.inferenceServiceName} model is selected`);
      genAiPlayground.verifyModelIsSelected(testData.inferenceServiceName);

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
