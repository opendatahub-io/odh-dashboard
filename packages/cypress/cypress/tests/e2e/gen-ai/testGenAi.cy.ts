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
      cy.step('Log into the application');
      cy.visitWithLogin('/?devFeatureFlags=genAiStudio=true', HTPASSWD_CLUSTER_ADMIN_USER);

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
