import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  deleteOpenShiftProject,
  createOpenShiftProject,
  waitForUserProjectAccess,
} from '../../../utils/oc_commands/project';
import { waitForOGXServerReady } from '../../../utils/oc_commands/ogxServer';
import {
  waitForResource,
  patchOpenShiftResource,
  pollUntilSuccess,
} from '../../../utils/oc_commands/baseCommands';
import {
  enablePromptManagementFeatures,
  disablePromptManagementFeatures,
  deleteStalePromptByName,
} from '../../../utils/oc_commands/mlflow';
import {
  createGenAiPromptViaAPI,
  forceDashboardConfigRefresh,
  deployGenAiModel,
  cleanupServingRuntimeTemplate,
} from '../../../utils/oc_commands/genAi';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { GenAiTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import { genAiPlayground } from '../../../pages/genAiPlayground';
import {
  chatbotPromptModal,
  chatbotPromptDrawer,
  chatbotCreatePromptModal,
  chatbotPromptAssistant,
} from '../../../pages/chatbotPromptManagement';
import { getVllmCpuAmd64RuntimeInfo } from '../../../utils/fileParserUtil';
import { cleanupHardwareProfiles } from '../../../utils/oc_commands/hardwareProfiles';

type ConfigInstance = { namespace: string; name: string };

const getOdhDashboardConfigs = (): Cypress.Chainable<ConfigInstance[]> =>
  cy
    .exec(
      `oc get OdhDashboardConfig -A -o jsonpath='{range .items[*]}{.metadata.namespace}{" "}{.metadata.name}{"\\n"}{end}'`,
      { failOnNonZeroExit: false },
    )
    .then((result) => {
      if (result.exitCode !== 0) {
        throw new Error(
          `Failed to list OdhDashboardConfig resources: ${result.stderr || result.stdout}`,
        );
      }
      const lines = result.stdout.replace(/'/g, '').trim().split('\n').filter(Boolean);
      if (lines.length > 0) {
        return lines.map((line) => {
          const [namespace, name] = line.split(/\s+/);
          return { namespace, name };
        });
      }
      return [
        {
          namespace: Cypress.env('APPLICATIONS_NAMESPACE') as string,
          name: 'odh-dashboard-config',
        },
      ];
    });

const originalGlobalMLflowNamespaces: Partial<Record<string, string[]>> = {};

const setGlobalMLflowNamespaces = (namespaces: string[]): void => {
  getOdhDashboardConfigs().then((configs) => {
    const mergedValues: Record<string, string[]> = {};

    for (const { namespace: ns, name } of configs) {
      cy.exec(
        `oc get OdhDashboardConfig ${name} -n ${ns} -o json | jq -c '.spec.globalMLflowNamespaces // []'`,
        { failOnNonZeroExit: false },
      ).then((result) => {
        let existing: string[] = [];
        try {
          const parsed: unknown = JSON.parse(result.stdout.trim());
          if (Array.isArray(parsed)) {
            existing = parsed as string[];
          }
        } catch {
          // Field absent or malformed — treat as empty
        }
        if (!(ns in originalGlobalMLflowNamespaces)) {
          originalGlobalMLflowNamespaces[ns] = existing;
        }
        const merged = [...new Set([...existing, ...namespaces])];
        mergedValues[ns] = merged;
        const patchContent = JSON.stringify({ spec: { globalMLflowNamespaces: merged } });
        patchOpenShiftResource('OdhDashboardConfig', name, patchContent, ns);
      });
    }

    cy.step('Wait for globalMLflowNamespaces to be confirmed in all config instances');
    cy.then(() => {
      for (const { namespace: ns, name } of configs) {
        const expected = JSON.stringify(mergedValues[ns]);
        pollUntilSuccess(
          `oc get OdhDashboardConfig ${name} -n ${ns} -o json | jq -e '.spec.globalMLflowNamespaces == ${expected}'`,
          `globalMLflowNamespaces to be set in ${ns}`,
          { maxAttempts: 30, pollIntervalMs: 2000 },
        );
      }
    });
  });
};

const restoreGlobalMLflowNamespaces = (): void => {
  getOdhDashboardConfigs().then((configs) => {
    const saved = configs.filter(({ namespace: ns }) => ns in originalGlobalMLflowNamespaces);

    for (const { namespace: ns, name } of saved) {
      const original = originalGlobalMLflowNamespaces[ns] ?? [];
      const patchContent = JSON.stringify({ spec: { globalMLflowNamespaces: original } });
      patchOpenShiftResource('OdhDashboardConfig', name, patchContent, ns);
    }

    for (const { namespace: ns, name } of saved) {
      const expected = JSON.stringify(originalGlobalMLflowNamespaces[ns] ?? []);
      pollUntilSuccess(
        `oc get OdhDashboardConfig ${name} -n ${ns} -o json | jq -e '(.spec.globalMLflowNamespaces // []) == ${expected}'`,
        `globalMLflowNamespaces to be restored in ${ns}`,
        { maxAttempts: 15, pollIntervalMs: 2000 },
      );
    }
  });
};

const waitForGlobalPromptsInBFF = (
  projectNamespace: string,
  expectedPromptName: string,
  maxAttempts = 15,
  pollIntervalMs = 3000,
): void => {
  const check = (attemptNumber: number): void => {
    cy.request({
      url: `/gen-ai/api/v1/mlflow/prompts?namespace=${encodeURIComponent(projectNamespace)}`,
      failOnStatusCode: false,
    }).then((response) => {
      const body = response.body || {};
      const prompts: { name?: string; scope?: { type?: string } }[] =
        body.data?.prompts || body.prompts || [];
      const found = prompts.some(
        (p) => p.name === expectedPromptName && p.scope?.type === 'global',
      );

      if (found) {
        cy.log(`Global prompt "${expectedPromptName}" discovered by BFF`);
        return;
      }

      if (attemptNumber >= maxAttempts) {
        throw new Error(
          `MLflow BFF did not return global prompt "${expectedPromptName}" after ${maxAttempts} attempts ` +
            `(status=${response.status}, prompts=${prompts.length})`,
        );
      }

      cy.log(`Waiting for BFF global prompt (attempt ${attemptNumber}/${maxAttempts})`);
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(pollIntervalMs).then(() => check(attemptNumber + 1));
    });
  };

  cy.step('Wait for MLflow BFF to discover global namespace and prompt');
  check(1);
};

const GLOBAL_PROMPT_TEMPLATE = 'You are a global template for summarization tasks.';
const GLOBAL_PROMPT_COMMIT = 'Initial global prompt version';
const PROJECT_PROMPT_TEMPLATE = 'You are a project-level assistant.';
const PROJECT_PROMPT_COMMIT = 'Initial project prompt version';

describe('Verify Global Prompt Management in Playground Settings', () => {
  let testData: GenAiTestData;
  let projectName: string;
  let globalNamespace: string;
  let servingRuntimeName: string;
  let hardwareProfileName: string;
  const uuid = generateTestUUID();
  const globalPromptName = `global-prompt-${uuid}`;
  const projectPromptName = `project-prompt-${uuid}`;

  retryableBefore(() => {
    cy.fixture('e2e/genAi/testGenAi.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as GenAiTestData;
        hardwareProfileName = testData.hardwareProfileName;
        globalNamespace = `gen-ai-global-${uuid}`;
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
            } else {
              projectName = `${prefix}-${uuid}`;
              cy.step(`Create project ${projectName}`);
              createCleanProject(projectName);
              waitForUserProjectAccess(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);
            }

            return cy
              .exec(`oc get inferenceservices -n ${projectName} --no-headers 2>/dev/null | wc -l`, {
                failOnNonZeroExit: false,
              })
              .then((isResult) => {
                if (parseInt(isResult.stdout.trim(), 10) > 0) {
                  cy.log('Model already deployed');
                  return;
                }
                cy.step('Deploy Gen AI model');
                deployGenAiModel(projectName, testData);
              });
          });
      })
      .then(() => {
        cy.step('Enable prompt management features');
        return enablePromptManagementFeatures();
      })
      .then(() =>
        cy
          .exec(`oc get ogxservers -n ${projectName} --no-headers 2>/dev/null`, {
            failOnNonZeroExit: false,
          })
          .then((result) => {
            if (result.stdout.trim()) {
              cy.log('OGXServer already exists');
              return waitForOGXServerReady(projectName);
            }

            cy.step('Add model to playground to create OGXServer');
            genAiPlayground.navigateToAssets(projectName);
            genAiPlayground.findAddToPlaygroundButton().should('be.visible').click();
            genAiPlayground.findConfigurationTable().should('be.visible');
            genAiPlayground.ensureModelCheckboxIsChecked(testData.modelDeploymentName);
            genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();

            waitForResource('configmap', testData.configMapName, projectName);
            waitForOGXServerReady(projectName);
            return waitForResource('service', testData.playgroundServiceName, projectName);
          }),
      )
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
        setGlobalMLflowNamespaces([globalNamespace]);
        forceDashboardConfigRefresh();
      })
      .then(() => {
        cy.step('Create global prompt via BFF');
        return createGenAiPromptViaAPI(
          globalNamespace,
          globalPromptName,
          GLOBAL_PROMPT_TEMPLATE,
          GLOBAL_PROMPT_COMMIT,
        );
      })
      .then(() => {
        cy.step('Create project prompt via BFF');
        return createGenAiPromptViaAPI(
          projectName,
          projectPromptName,
          PROJECT_PROMPT_TEMPLATE,
          PROJECT_PROMPT_COMMIT,
        );
      })
      .then(() => {
        waitForGlobalPromptsInBFF(projectName, globalPromptName);
      });
  });

  after(() => {
    deleteStalePromptByName(projectName, `copy-of-${globalPromptName}`);
    deleteStalePromptByName(globalNamespace, globalPromptName);
    deleteStalePromptByName(projectName, projectPromptName);
    restoreGlobalMLflowNamespaces();
    disablePromptManagementFeatures();
    deleteOpenShiftProject(globalNamespace, { wait: false, ignoreNotFound: true });

    if (servingRuntimeName) {
      cleanupServingRuntimeTemplate(servingRuntimeName);
    }
    if (hardwareProfileName) {
      cleanupHardwareProfiles(hardwareProfileName);
    }
  });

  it(
    'Browse global prompts, load into playground, and save as project copy',
    {
      tags: [
        '@Sanity',
        '@SanitySet1',
        '@PromptManagement',
        '@MLflow',
        '@NonConcurrent',
        '@MLflowEmbeddedCI',
        '@GlobalPrompts',
      ],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/?devFeatureFlags=genAiStudio=true', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to playground');
      genAiPlayground.navigateToPlaygroundWithPromptManagementRetry(projectName);

      cy.step('Open settings panel and switch to prompt tab');
      genAiPlayground.ensureSettingsPanelOpen();
      genAiPlayground.findSettingsPromptTab().click();

      cy.step('Open prompt management modal');
      chatbotPromptAssistant.findLoadPromptButton().click();

      cy.step('Verify project tab is active and project prompt is listed');
      chatbotPromptModal.findProjectPromptsTab().should('have.attr', 'aria-selected', 'true');
      chatbotPromptModal.findTableRow(projectPromptName).should('exist');

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

      cy.step('Edit the prompt content');
      chatbotPromptAssistant.findEditButton().should('be.visible').click();
      chatbotPromptAssistant.findTextarea().clear().type('Modified global template for testing.');

      cy.step('Verify save is disabled but save-as is enabled for global prompts');
      chatbotPromptAssistant.findUnsavedIndicator().should('exist');
      chatbotPromptAssistant.findSaveButton().should('be.disabled');
      chatbotPromptAssistant.findSaveAsButton().should('be.enabled');

      cy.step('Click Save As to create a project copy');
      chatbotPromptAssistant.findSaveAsButton().click();
      chatbotCreatePromptModal.find().should('be.visible');
      chatbotCreatePromptModal.findNameInput().should('have.value', `copy-of-${globalPromptName}`);
      chatbotCreatePromptModal.findCommitMessageInput().type('Saved as project copy from global');
      chatbotCreatePromptModal.findSaveButton().click();

      cy.step('Verify save-as modal closes');
      chatbotCreatePromptModal.find().should('not.exist');

      cy.step('Re-open modal and verify the copy is in the project tab');
      chatbotPromptAssistant.findLoadPromptButton().click();
      chatbotPromptModal.findProjectPromptsTab().click();
      chatbotPromptModal.findTableRow(`copy-of-${globalPromptName}`).should('exist');

      cy.step('Verify the copy is not in the global tab');
      chatbotPromptModal.findGlobalPromptsTab().click();
      chatbotPromptModal.findTableRow(`copy-of-${globalPromptName}`).should('not.exist');
    },
  );
});
