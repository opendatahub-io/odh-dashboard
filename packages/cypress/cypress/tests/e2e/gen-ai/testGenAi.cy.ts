import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  deleteOpenShiftProject,
  findExistingProjectByPrefix,
  waitForProjectReady,
} from '../../../utils/oc_commands/project';
import { checkLlamaStackDistributionReady } from '../../../utils/oc_commands/llamaStackDistribution';
import { waitForResource } from '../../../utils/oc_commands/baseCommands';
import { cleanupServingRuntimeTemplate, deployGenAiModel } from '../../../utils/oc_commands/genAi';
import { getCustomResource } from '../../../utils/oc_commands/customResources';
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
  let skipTest = false;
  const uuid = generateTestUUID();

  let servingRuntimeName: string;
  let hardwareProfileName: string;

  retryableBefore(() => {
    Cypress.on('uncaught:exception', (err) => {
      if (err.message.includes('expected expression') || err.message.includes('Unexpected token')) {
        return false;
      }
      return true;
    });

    cy.step('Check if the operator is RHOAI');
    getCustomResource('redhat-ods-operator', 'Deployment', 'name=rhods-operator').then((result) => {
      if (!result.stdout.includes('rhods-operator')) {
        cy.log('RHOAI operator not found, skipping the test (Gen AI is RHOAI-specific).');
        skipTest = true;
      } else {
        cy.log('RHOAI operator confirmed:', result.stdout);
      }
    });

    cy.then(() => {
      if (skipTest) {
        return;
      }

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
        .then(() =>
          findExistingProjectByPrefix(testData.projectNamePrefix).then((existingProject) => {
            if (existingProject) {
              cy.log(`Reusing existing project: ${existingProject}`);
              projectName = existingProject;
              return;
            }

            projectName = `${testData.projectNamePrefix}-${uuid}`;
            cy.step(`Create project ${projectName}`);
            createCleanProject(projectName);

            return waitForProjectReady(projectName).then(() => {
              cy.step('Deploy Gen AI model via oc commands');
              deployGenAiModel(projectName, testData);
            });
          }),
        );
    });
  });

  after(() => {
    if (skipTest) {
      return;
    }

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
    'Gen AI: model deployment and playground',
    {
      tags: [
        '@Sanity',
        '@SanitySet1',
        '@GenAI',
        '@ModelServing',
        '@Deployment',
        '@Playground',
        '@NonConcurrent',
      ],
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
