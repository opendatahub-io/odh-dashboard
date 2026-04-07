import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  enablePromptManagementFeatures,
  disablePromptManagementFeatures,
} from '../../../utils/oc_commands/mlflow';
import { deleteOpenShiftProject, createOpenShiftProject } from '../../../utils/oc_commands/project';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { loadPromptManagementFixture } from '../../../utils/dataLoader';
import { promptManagement } from '../../../pages/promptManagement';
import { appChrome } from '../../../pages/appChrome';
import type { PromptManagementTestData } from '../../../types';

describe('Verify Prompt Management page', () => {
  let testData: PromptManagementTestData;
  let projectName: string;
  const uuid = generateTestUUID();

  retryableBefore(() => {
    loadPromptManagementFixture('e2e/promptManagement/testPromptManagement.yaml')
      .then((fixtureData) => {
        testData = fixtureData;
        projectName = `${fixtureData.projectName}-${uuid}`;
        return deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true });
      })
      .then(() => createOpenShiftProject(projectName))
      .then(() => {
        cy.step('Enable all features required for Prompt Management');
        return enablePromptManagementFeatures();
      });
  });

  after(() => {
    disablePromptManagementFeatures();
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Create a prompt and verify it appears in the prompts table',
    {
      tags: ['@Sanity', '@SanitySet1', '@PromptManagement', '@MLflow'],
    },
    () => {
      const prompt = testData.prompts[0];

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Prompt Management page');
      promptManagement.visit(projectName);

      cy.step('Verify page title is displayed');
      promptManagement.findPageTitle().should('exist');

      cy.step('Verify Launch MLflow button is present');
      promptManagement.findLaunchMlflowButton().should('be.visible');

      cy.step('Verify the embedded MLflow prompts UI rendered');
      promptManagement.findMlflowUnavailableState().should('not.exist');
      promptManagement.findPromptsSearchInput().should('be.visible');

      cy.step('Click Create prompt button');
      promptManagement.findCreatePromptButton().click();

      cy.step('Fill in prompt name');
      promptManagement.findPromptNameInput().should('be.visible').type(prompt.name);

      cy.step('Fill in prompt template');
      promptManagement
        .findPromptTemplateInput()
        .should('be.visible')
        .type(prompt.template, { parseSpecialCharSequences: false });

      cy.step('Fill in commit message');
      promptManagement.findPromptCommitMessageInput().type(prompt.commitMessage);

      cy.step('Submit the create prompt form');
      promptManagement.findCreateDialogSubmitButton().click();

      cy.step('Verify the prompt detail page is shown');
      promptManagement.findPromptDetailHeading(prompt.name).should('be.visible');
      promptManagement.findCreatePromptVersionButton().should('be.visible');

      cy.step('Verify Version 1 appears in the versions table');
      promptManagement.findVersionsTableHeader().should('be.visible');
      promptManagement.findVersionInTable(prompt.versionLabel).should('be.visible');

      cy.step('Create a second version');
      const version2 = testData.prompts[1];
      promptManagement.findCreatePromptVersionButton().click();
      promptManagement
        .findPromptTemplateInput()
        .should('be.visible')
        .and('not.be.disabled')
        .clear()
        .type(version2.template, { parseSpecialCharSequences: false });
      promptManagement
        .findPromptCommitMessageInput()
        .should('not.be.disabled')
        .clear()
        .type(version2.commitMessage);
      promptManagement.findCreateDialogSubmitButton().click();

      cy.step('Verify Version 2 appears in the versions table');
      promptManagement.findVersionInTable(version2.versionLabel).should('be.visible');
      promptManagement.findVersionInTable(prompt.versionLabel).should('be.visible');

      cy.step('Verify Preview mode is active');
      promptManagement.findPreviewTab().should('be.checked');

      cy.step('Verify Compare and Traces tabs exist');
      promptManagement.findCompareTab().should('exist');

      cy.step('Navigate away to home page');
      appChrome.findMainContent().should('be.visible');

      cy.step('Navigate back to Prompt Management page');
      promptManagement.visit(projectName);

      cy.step('Verify the prompt persists after navigation');
      promptManagement.findPromptInTable(prompt.name).should('be.visible');

      cy.step('Toggle dark mode on');
      promptManagement.findDarkThemeToggle().click();

      cy.step('Verify dark theme is applied');
      promptManagement.getHtmlDarkModeClass().should('equal', true);
      promptManagement.getMlflowDarkModeStorageValue().should('equal', 'true');

      cy.step('Toggle light mode back on');
      promptManagement.findLightThemeToggle().click();

      cy.step('Verify light theme is restored');
      promptManagement.getHtmlDarkModeClass().should('equal', false);
      promptManagement.getMlflowDarkModeStorageValue().should('equal', 'false');
    },
  );
});
