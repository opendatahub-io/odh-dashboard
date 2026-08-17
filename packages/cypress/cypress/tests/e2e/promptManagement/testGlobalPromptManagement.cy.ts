import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  enablePromptManagementFeatures,
  disablePromptManagementFeatures,
  deleteStalePromptByName,
} from '../../../utils/oc_commands/mlflow';
import {
  createGenAiPromptViaAPI,
  deleteGenAiPromptViaAPI,
  setGlobalMLflowNamespaces,
  clearGlobalMLflowNamespaces,
  forceDashboardConfigRefresh,
} from '../../../utils/oc_commands/genAi';
import { deleteOpenShiftProject, createOpenShiftProject } from '../../../utils/oc_commands/project';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import {
  chatbotPromptModal,
  chatbotPromptDrawer,
  chatbotCreatePromptModal,
  chatbotPromptAssistant,
} from '../../../pages/chatbotPromptManagement';

const GLOBAL_PROMPT_TEMPLATE = 'You are a global template for summarization tasks.';
const GLOBAL_PROMPT_COMMIT = 'Initial global prompt version';
const PROJECT_PROMPT_TEMPLATE = 'You are a project-level assistant.';
const PROJECT_PROMPT_COMMIT = 'Initial project prompt version';

describe('Verify Global Prompt Management in Playground', () => {
  let projectName: string;
  let globalNamespace: string;
  const uuid = generateTestUUID();
  const globalPromptName = `global-prompt-${uuid}`;
  const projectPromptName = `project-prompt-${uuid}`;

  retryableBefore(() => {
    projectName = `gen-ai-test-${uuid}`;
    globalNamespace = `gen-ai-global-${uuid}`;

    cy.step('Delete stale projects from prior runs');
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true });
    deleteOpenShiftProject(globalNamespace, { wait: true, ignoreNotFound: true });

    cy.step('Create project and global namespaces');
    createOpenShiftProject(projectName);
    createOpenShiftProject(globalNamespace);

    cy.step('Enable all features required for Prompt Management');
    enablePromptManagementFeatures();

    cy.step('Log in to establish session for API calls');
    cy.visitWithLogin('/?devFeatureFlags=genAiStudio=true', HTPASSWD_CLUSTER_ADMIN_USER);

    cy.step('Configure globalMLflowNamespaces in dashboard config');
    setGlobalMLflowNamespaces([globalNamespace]);
    forceDashboardConfigRefresh();

    cy.step('Create a global prompt via BFF API');
    createGenAiPromptViaAPI(
      globalNamespace,
      globalPromptName,
      GLOBAL_PROMPT_TEMPLATE,
      GLOBAL_PROMPT_COMMIT,
    );

    cy.step('Create a project prompt via BFF API');
    createGenAiPromptViaAPI(
      projectName,
      projectPromptName,
      PROJECT_PROMPT_TEMPLATE,
      PROJECT_PROMPT_COMMIT,
    );
  });

  after(() => {
    deleteGenAiPromptViaAPI(globalNamespace, globalPromptName);
    deleteGenAiPromptViaAPI(projectName, projectPromptName);
    deleteStalePromptByName(projectName, `copy-of-${globalPromptName}`);
    clearGlobalMLflowNamespaces();
    disablePromptManagementFeatures();
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    deleteOpenShiftProject(globalNamespace, { wait: false, ignoreNotFound: true });
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
      cy.visit(`/gen-ai-studio/playground/${projectName}?devFeatureFlags=genAiStudio=true`);
      cy.findByTestId('page-title', { timeout: 30000 })
        .should('be.visible')
        .and('contain.text', 'Playground');

      cy.step('Open settings panel and switch to prompt tab');
      cy.findByTestId('settings-button').then(($btn) => {
        if ($btn.attr('aria-expanded') !== 'true') {
          cy.wrap($btn).click();
        }
      });
      cy.findByTestId('chatbot-settings-page-tab-prompt').click();

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
