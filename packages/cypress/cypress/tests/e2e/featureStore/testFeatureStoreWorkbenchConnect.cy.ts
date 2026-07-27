import * as yaml from 'js-yaml';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { featureStoreGlobal } from '../../../pages/featureStore/featureStoreGlobal';
import { deleteOpenShiftProject, createOpenShiftProject } from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import type { FeatureStoreTestData } from '../../../types';
import { createFeatureStoreCR } from '../../../utils/oc_commands/featureStoreResources';
import { retryableBefore, wasSetupPerformed } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { isRHOAI } from '../../../utils/oc_commands/applications';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { projectDetails, projectListPage } from '../../../pages/projects';
import { workbenchPage, createSpawnerPage } from '../../../pages/workbench';
import { NotebookStatusLabel } from '../../../types';
import { selectNotebookImageWithBackendFallback } from '../../../utils/oc_commands/imageStreams';

describe('Verify user can connect Feature Stores to Workbenches', () => {
  let testData: FeatureStoreTestData;
  let fsProjectName: string;
  let dspProjectName: string;
  let workbenchName: string;
  let skipTest = false;
  const uuid = generateTestUUID();

  const shouldSkip = () => {
    if (skipTest) {
      cy.log('Skipping test - Feature Store is RHOAI-specific and not available on ODH.');
      return true;
    }
    return false;
  };

  retryableBefore(() => {
    cy.step('Ensure admin oc session for setup');
    ensureAdminOcSession();

    cy.step('Check if the operator is RHOAI');
    isRHOAI().then((rhoai) => {
      if (!rhoai) {
        cy.log('ODH detected, skipping RHOAI-specific test.');
        skipTest = true;
      }
    });

    cy.then(() => {
      if (skipTest) {
        return;
      }

      cy.fixture('e2e/featureStoreResources/testFeatureStoreResources.yaml', 'utf8')
        .then((yamlContent: string) => {
          testData = yaml.load(yamlContent) as FeatureStoreTestData;
          fsProjectName = `${testData.projectName}-wb-${uuid}`;
          dspProjectName = `${testData.dspProjectName}-${uuid}`;
          workbenchName = `${testData.workbenchName}-${uuid}`;
        })
        .then(() => {
          cy.step(`Create Feature Store namespace: ${fsProjectName}`);
          createCleanProject(fsProjectName);
        })
        .then(() => {
          cy.step(`Apply FeatureStore CR in namespace: ${fsProjectName}`);
          createFeatureStoreCR(fsProjectName, testData.feastInstanceName);
        })
        .then(() => {
          cy.step(`Create Data Science Project namespace: ${dspProjectName}`);
          return deleteOpenShiftProject(dspProjectName, {
            wait: true,
            ignoreNotFound: true,
          }).then(() => createOpenShiftProject(dspProjectName));
        });
    });
  });

  after(() => {
    if (!wasSetupPerformed() || shouldSkip()) {
      cy.log('Skipping cleanup: Setup was not performed or tests were skipped');
      return;
    }
    cy.step('Restore admin oc session for cleanup');
    ensureAdminOcSession();

    cy.step(`Delete Data Science Project: ${dspProjectName}`);
    deleteOpenShiftProject(dspProjectName, { wait: false, ignoreNotFound: true });

    cy.step(`Delete Feature Store namespace: ${fsProjectName}`);
    deleteOpenShiftProject(fsProjectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Select a feature store during workbench creation and verify connectivity',
    {
      tags: ['@Dashboard', '@FeatureStore', '@FeatureStoreCI', '@Sanity', '@SanitySet1'],
    },
    () => {
      if (shouldSkip()) {
        return;
      }

      cy.step('Log in as admin user');
      cy.visitWithLogin('/', LDAP_ADMIN_USER);

      cy.step(`Navigate to workbenches tab of project ${dspProjectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(dspProjectName);
      projectListPage.findProjectLink(dspProjectName).click();
      projectDetails.findSectionTab(testData.sectionTab).click();

      cy.step('Click Create workbench button');
      workbenchPage.findCreateButton().click();

      cy.step('Enter workbench name');
      createSpawnerPage.getNameInput().fill(workbenchName);

      cy.step('Select a notebook image');
      selectNotebookImageWithBackendFallback(testData.notebookImage, createSpawnerPage);

      cy.step('Open the Select feature store modal');
      createSpawnerPage.findSelectFeatureStoreButton().click();
      createSpawnerPage.findSelectFeatureStoresModal().should('be.visible');

      cy.step(
        `Verify modal table shows ${testData.feastCreditScoringProject} with expected columns`,
      );
      createSpawnerPage
        .findSelectFeatureStoresModalRow(fsProjectName, testData.feastCreditScoringProject)
        .should('exist');

      cy.step(
        `Select ${testData.feastCreditScoringProject} and verify Connect button becomes enabled`,
      );
      createSpawnerPage.toggleFeatureStoreInModal(
        fsProjectName,
        testData.feastCreditScoringProject,
      );
      createSpawnerPage.shouldHaveSelectFeatureStoresModalButtonEnabled();

      cy.step('Click Connect and verify modal closes');
      createSpawnerPage.connectFeatureStoresInModal();

      cy.step('Verify selected store appears in the connected table');
      createSpawnerPage.shouldHaveFeatureStoreSelected(testData.feastCreditScoringProject);

      cy.step('Submit the workbench creation');
      createSpawnerPage.findSubmitButton().click();

      cy.step('Wait for workbench to reach Ready status');
      const notebookRow = workbenchPage.getNotebookRow(workbenchName);
      notebookRow.expectStatusLabelToBe(NotebookStatusLabel.Ready, 300000);

      cy.step('Expand the workbench row and verify Connected feature stores section');
      notebookRow.findExpansionButton().click();
      notebookRow.shouldHaveFeatureStoreTitle();
      notebookRow.shouldHaveFeatureStoreItems([testData.feastCreditScoringProject]);

      cy.step('Navigate to Feature Store Overview page');
      featureStoreGlobal.navigateToOverview();

      cy.step(`Select the ${testData.feastCreditScoringProject} project`);
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);

      cy.step('Click View connected workbenches link and verify modal opens');
      featureStoreGlobal.findConnectedWorkbenchesLink().click();
      featureStoreGlobal.findConnectedWorkbenchesModal().should('be.visible');

      cy.step('Verify the workbench appears in the connected workbenches table');
      featureStoreGlobal.findConnectedWorkbenchesTable().should('be.visible');
      featureStoreGlobal.findConnectedWorkbenchesTable().should('contain.text', workbenchName);
      featureStoreGlobal.findConnectedWorkbenchesTable().should('contain.text', dspProjectName);
    },
  );
});
