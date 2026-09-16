import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  deleteOpenShiftProject,
  createOpenShiftProject,
  waitForUserProjectAccess,
} from '../../../utils/oc_commands/project';
import { waitForOGXServerReady } from '../../../utils/oc_commands/ogxServer';
import {
  startPortForward,
  stopPortForward,
  waitForResource,
  type PortForwardHandle,
} from '../../../utils/oc_commands/baseCommands';
import {
  enableMlflowBackend,
  disablePromptManagementFeatures,
  deleteStalePromptByName,
} from '../../../utils/oc_commands/mlflow';
import {
  createGenAiPromptViaAPI,
  forceDashboardConfigRefresh,
  deployGenAiModel,
  cleanupServingRuntimeTemplate,
  setGlobalMLflowNamespaces,
  removeGlobalMLflowNamespaces,
  waitForGlobalPromptsInBFF,
} from '../../../utils/oc_commands/genAi';
import type { GlobalMLflowNamespacesBaseline } from '../../../utils/oc_commands/genAi';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { GenAiTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import { genAiPlayground } from '../../../pages/genAiPlayground';
import {
  chatbotPromptModal,
  chatbotPromptDrawer,
  chatbotPromptAssistant,
} from '../../../pages/chatbotPromptManagement';
import { getVllmCpuAmd64RuntimeInfo } from '../../../utils/fileParserUtil';
import { cleanupHardwareProfiles } from '../../../utils/oc_commands/hardwareProfiles';

type PromptManagementTestData = {
  globalPrompt: {
    template: string;
    commitMessage: string;
  };
};

describe('Verify Global Prompt Management in Playground Settings', () => {
  let testData: GenAiTestData;
  let promptManagementTestData: PromptManagementTestData;
  let projectName: string;
  let globalNamespace: string;
  let servingRuntimeName: string;
  let hardwareProfileName: string;
  let portForwardHandle: PortForwardHandle | null = null;
  const globalMLflowNamespacesBaselines: GlobalMLflowNamespacesBaseline[] = [];
  const uuid = generateTestUUID();
  const globalPromptName = `global-prompt-${uuid}`;

  retryableBefore(() => {
    cy.fixture('e2e/genAi/testGenAiModelDeployment.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as GenAiTestData;
        hardwareProfileName = testData.hardwareProfileName;
        globalNamespace = `gen-ai-global-${uuid}`;
      })
      .then(() => cy.fixture('e2e/genAi/testGenAiSettingsSanityPromptManagement.yaml', 'utf8'))
      .then((yamlContent: string) => {
        promptManagementTestData = yaml.load(yamlContent) as PromptManagementTestData;
      })
      .then(() => getVllmCpuAmd64RuntimeInfo())
      .then((info) => {
        servingRuntimeName = info.singleModelServingName;
        return cleanupServingRuntimeTemplate(servingRuntimeName);
      })
      .then(() => {
        projectName = `${testData.projectNamePrefix}-${uuid}`;
        cy.step(`Create project ${projectName}`);
        return createCleanProject(projectName)
          .then(() => waitForUserProjectAccess(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME))
          .then(() => {
            cy.step('Deploy Gen AI model');
            deployGenAiModel(projectName, testData);
          });
      })
      .then(() => {
        cy.step('Enable MLflow backend');
        return enableMlflowBackend();
      })
      .then(() => {
        cy.step('Delete stale global namespace');
        return deleteOpenShiftProject(globalNamespace, { wait: true, ignoreNotFound: true });
      })
      .then(() => {
        cy.step('Create global namespace');
        return createOpenShiftProject(globalNamespace);
      })
      .then(() => {
        cy.step('Configure global namespaces');
        cy.visitWithLogin('/?devFeatureFlags=genAiStudio=true', HTPASSWD_CLUSTER_ADMIN_USER);
        setGlobalMLflowNamespaces([globalNamespace], globalMLflowNamespacesBaselines);
        forceDashboardConfigRefresh();
      })
      .then(() => {
        cy.step('Create global prompt via BFF');
        return createGenAiPromptViaAPI(
          globalNamespace,
          globalPromptName,
          promptManagementTestData.globalPrompt.template,
          promptManagementTestData.globalPrompt.commitMessage,
        );
      })
      .then(() => {
        waitForGlobalPromptsInBFF(projectName, globalPromptName);
      });
  });

  after(() => {
    stopPortForward(portForwardHandle);

    if (globalNamespace) {
      deleteStalePromptByName(globalNamespace, globalPromptName);
      deleteOpenShiftProject(globalNamespace, { wait: false, ignoreNotFound: true });
    }
    removeGlobalMLflowNamespaces(globalMLflowNamespacesBaselines);
    disablePromptManagementFeatures();

    if (servingRuntimeName) {
      cleanupServingRuntimeTemplate(servingRuntimeName);
    }
    if (hardwareProfileName) {
      cleanupHardwareProfiles(hardwareProfileName);
    }
    if (projectName) {
      deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    }
  });

  it(
    'Load a global prompt and use it in the playground',
    {
      tags: ['@GenAI', '@PromptManagement', '@MLflow', '@NonConcurrent', '@GlobalPrompts'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/?devFeatureFlags=genAiStudio=true', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to AI asset endpoints page');
      genAiPlayground.navigateToAssets(projectName);

      cy.step('Add model to playground');
      genAiPlayground.findAddToPlaygroundButton().should('be.visible').click();
      genAiPlayground.findConfigurationTable().should('be.visible');
      genAiPlayground.ensureModelCheckboxIsChecked(testData.modelDeploymentName);
      genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();

      cy.step('Wait for playground resources');
      waitForResource('configmap', testData.configMapName, projectName);
      waitForOGXServerReady(projectName);
      waitForResource('service', testData.playgroundServiceName, projectName);

      cy.step('Start port-forward for LSD service');
      startPortForward(projectName, testData.playgroundServiceName, 8321).then((handle) => {
        portForwardHandle = handle;
      });

      cy.step('Navigate to playground');
      genAiPlayground.navigateToPlaygroundWithPromptManagementRetry(projectName);

      cy.step('Open settings panel and switch to prompt tab');
      genAiPlayground.ensureSettingsPanelOpen();
      genAiPlayground.findSettingsPromptTab().click();

      cy.step('Open prompt management modal');
      chatbotPromptAssistant.findLoadPromptButton().click();

      cy.step('Verify project tab is active');
      chatbotPromptModal.findProjectPromptsTab().should('have.attr', 'aria-selected', 'true');

      cy.step('Switch to global prompts tab');
      chatbotPromptModal.findGlobalPromptsTab().click();

      cy.step('Verify global prompt is listed with read-only label');
      chatbotPromptModal.findTableRow(globalPromptName).should('exist');
      chatbotPromptModal.findTableRow(globalPromptName).within(() => {
        cy.findByTestId('read-only-label').should('exist');
      });

      cy.step('Select the global prompt and verify drawer opens');
      chatbotPromptModal.findTableRow(globalPromptName).click();
      chatbotPromptDrawer.findPanel().should('be.visible');

      cy.step('Load global prompt into playground');
      chatbotPromptModal.findLoadButton().should('be.enabled').click();
      chatbotPromptModal.find().should('not.exist');

      cy.step('Verify prompt name and scope label show Global');
      chatbotPromptAssistant.findNameTitle().should('contain.text', globalPromptName);
      chatbotPromptAssistant.findScopeLabel().should('contain.text', 'Global');

      cy.step('Verify the loaded global prompt is not editable');
      chatbotPromptAssistant
        .findTextarea()
        .should('have.value', promptManagementTestData.globalPrompt.template)
        .and('have.attr', 'readonly');

      cy.step('Send a message using the global prompt');
      genAiPlayground.sendMessage(testData.testMessage);
      genAiPlayground.findUserMessage().should('exist').and('contain', testData.testMessage);
      genAiPlayground.findAssistantMessage({ timeout: 120000 }).should('exist').and('not.be.empty');
    },
  );
});
