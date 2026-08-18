import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  deleteOpenShiftProject,
  waitForUserProjectAccess,
} from '../../../utils/oc_commands/project';
import { waitForOGXServerReady } from '../../../utils/oc_commands/ogxServer';
import { waitForResource } from '../../../utils/oc_commands/baseCommands';
import { cleanupServingRuntimeTemplate, deployGenAiModel } from '../../../utils/oc_commands/genAi';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { GenAiTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import { genAiPlayground } from '../../../pages/genAiPlayground';
import { getVllmCpuAmd64RuntimeInfo } from '../../../utils/fileParserUtil';
import { cleanupHardwareProfiles } from '../../../utils/oc_commands/hardwareProfiles';

describe('Verify vLLM model deployment - Playground Integration', { testIsolation: false }, () => {
  let genAiTestData: GenAiTestData;
  let projectName: string;
  let servingRuntimeName: string;
  let hardwareProfileName: string;

  retryableBefore(() => {
    cy.fixture('e2e/genAi/testGenAiModelDeployment.yaml', 'utf8')
      .then((yamlContent: string) => {
        genAiTestData = yaml.load(yamlContent) as GenAiTestData;
        hardwareProfileName = genAiTestData.hardwareProfileName;
      })
      .then(() => getVllmCpuAmd64RuntimeInfo())
      .then((info) => {
        servingRuntimeName = info.singleModelServingName;
        return cleanupServingRuntimeTemplate(servingRuntimeName);
      })
      .then(() => {
        const prefix = genAiTestData.projectNamePrefix;
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
                deployGenAiModel(projectName, genAiTestData);
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
    'Verify deployed model works in playground',
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
      cy.visitWithLogin(
        '/?devFeatureFlags=genAiStudio=true,modelAsService=false',
        HTPASSWD_CLUSTER_ADMIN_USER,
      );

      cy.step('Navigate to AI asset endpoints page');
      genAiPlayground.navigateToAssets(projectName);

      cy.step('Click Add to playground button');
      genAiPlayground.findAddToPlaygroundButton().should('be.visible').click();

      cy.step('Ensure model is selected in the configuration table');
      genAiPlayground.findConfigurationTable().should('be.visible');
      genAiPlayground.ensureModelCheckboxIsChecked(genAiTestData.modelDeploymentName);

      cy.step('Click Create button in the modal');
      genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();

      cy.step('Wait for llama-stack-config ConfigMap to be created');
      waitForResource('configmap', genAiTestData.configMapName, projectName);

      cy.step('Wait for OGXServer to be ready');
      waitForOGXServerReady(projectName);

      cy.step('Wait for playground service to be created');
      waitForResource('service', genAiTestData.playgroundServiceName, projectName);

      cy.step('Navigate to playground');
      genAiPlayground.navigate(projectName);

      cy.step(`Select ${genAiTestData.inferenceServiceName} model from dropdown`);
      genAiPlayground.selectModelFromDropdown(genAiTestData.inferenceServiceName);

      cy.step(`Verify ${genAiTestData.inferenceServiceName} model is selected`);
      genAiPlayground.verifyModelIsSelected(genAiTestData.inferenceServiceName);

      cy.step('Verify message input is ready and functional');
      genAiPlayground.findMessageInput().should('be.enabled').and('be.visible');

      cy.step('Send a test message to verify chatbot interface is working');
      genAiPlayground.sendMessage(genAiTestData.testMessage);

      cy.step('Verify user message appears in chat');
      genAiPlayground.findUserMessage().should('exist').and('contain', genAiTestData.testMessage);

      cy.step(
        'Verify playground is functional (model inference not tested due to slow response time)',
      );
      cy.log('✅ Playground interface is functional and ready to receive messages');
    },
  );
});
