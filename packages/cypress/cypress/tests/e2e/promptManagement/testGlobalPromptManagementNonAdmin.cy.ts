import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import { deleteOpenShiftProject, createOpenShiftProject } from '../../../utils/oc_commands/project';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import {
  enablePromptManagementFeatures,
  disablePromptManagementFeatures,
  deleteStalePromptByName,
} from '../../../utils/oc_commands/mlflow';
import {
  createGenAiPromptViaAPI,
  forceDashboardConfigRefresh,
  removeGlobalMLflowNamespaces,
  setGlobalMLflowNamespaces,
  waitForGlobalMLflowNamespaceLabel,
  waitForGlobalMLflowNamespaceLabelAbsence,
  waitForGlobalMLflowRoleBindings,
  waitForGlobalPromptsInBFF,
} from '../../../utils/oc_commands/genAi';
import type { GlobalMLflowNamespacesBaseline } from '../../../utils/oc_commands/genAi';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { promptManagement } from '../../../pages/promptManagement';

type GlobalPromptTestData = {
  globalPrompt: {
    template: string;
    commitMessage: string;
  };
};

describe('Verify non-admin access to the global MLflow prompt workspace', () => {
  let testData: GlobalPromptTestData;
  let firstNamespace: string;
  let secondNamespace: string;
  let promptName: string;
  const globalMLflowNamespacesBaselines: GlobalMLflowNamespacesBaseline[] = [];
  const uuid = generateTestUUID();

  retryableBefore(() => {
    cy.step('Ensure admin oc session for global workspace setup');
    ensureAdminOcSession();

    cy.fixture('e2e/genAi/testGenAiSettingsSanityPromptManagement.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as GlobalPromptTestData;
        firstNamespace = `global-mlflow-a-${uuid}`;
        secondNamespace = `global-mlflow-b-${uuid}`;
        promptName = `global-prompt-${uuid}`;
      })
      .then(() => {
        cy.step('Create unique global MLflow namespaces');
        return deleteOpenShiftProject(firstNamespace, {
          wait: true,
          ignoreNotFound: true,
        }).then(() =>
          deleteOpenShiftProject(secondNamespace, {
            wait: true,
            ignoreNotFound: true,
          }),
        );
      })
      .then(() => createOpenShiftProject(firstNamespace))
      .then(() => createOpenShiftProject(secondNamespace))
      .then(() => {
        cy.step('Enable Prompt Management features');
        return enablePromptManagementFeatures();
      })
      .then(() => {
        cy.step('Set the first namespace as the global MLflow workspace');
        return setGlobalMLflowNamespaces([firstNamespace], globalMLflowNamespacesBaselines);
      })
      .then(() => {
        cy.step('Verify the first namespace receives the global workspace label and role bindings');
        waitForGlobalMLflowNamespaceLabel(firstNamespace);
        waitForGlobalMLflowRoleBindings(firstNamespace);
      })
      .then(() => {
        cy.step('Move the global MLflow workspace to the second namespace');
        return setGlobalMLflowNamespaces([secondNamespace], globalMLflowNamespacesBaselines);
      })
      .then(() => {
        cy.step('Verify the label moves with the global workspace');
        waitForGlobalMLflowNamespaceLabel(secondNamespace);
        waitForGlobalMLflowNamespaceLabelAbsence(firstNamespace);
        waitForGlobalMLflowRoleBindings(secondNamespace);
      })
      .then(() => {
        cy.step('Create a prompt in the active global workspace');
        cy.visitWithLogin('/?devFeatureFlags=genAiStudio=true', HTPASSWD_CLUSTER_ADMIN_USER);
        forceDashboardConfigRefresh();
        return createGenAiPromptViaAPI(
          secondNamespace,
          promptName,
          testData.globalPrompt.template,
          testData.globalPrompt.commitMessage,
        );
      })
      .then(() => {
        cy.step('Wait for the BFF to expose the global prompt');
        waitForGlobalPromptsInBFF(secondNamespace, promptName);
      });
  });

  after(() => {
    cy.step('Restore admin oc session for cleanup');
    ensureAdminOcSession();

    if (secondNamespace) {
      cy.step('Delete the global prompt');
      deleteStalePromptByName(secondNamespace, promptName);
    }

    cy.step('Restore the global MLflow namespace configuration');
    removeGlobalMLflowNamespaces(globalMLflowNamespacesBaselines);
    disablePromptManagementFeatures();

    for (const namespace of [firstNamespace, secondNamespace]) {
      if (namespace) {
        cy.step(`Delete the ${namespace} global MLflow namespace`);
        deleteOpenShiftProject(namespace, { wait: false, ignoreNotFound: true });
      }
    }
  });

  it(
    'Verify a non-admin user can read prompts from the global MLflow workspace',
    {
      tags: [
        '@GenAI',
        '@PromptManagement',
        '@MLflow',
        '@GlobalPrompts',
        '@GenAICI',
        '@MLflowEmbeddedCI',
      ],
    },
    () => {
      cy.step('Log in as a non-admin user');
      promptManagement.visit(secondNamespace, LDAP_CONTRIBUTOR_USER);

      cy.step('Verify the global project indicator is visible');
      promptManagement.findGlobalProjectIndicator().should('be.visible');

      cy.step('Verify the global prompt is visible to the non-admin user');
      promptManagement.findPromptInTable(promptName).should('be.visible');
    },
  );
});
