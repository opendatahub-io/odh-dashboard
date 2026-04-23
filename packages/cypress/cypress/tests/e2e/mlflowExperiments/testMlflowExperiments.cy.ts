import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  enableMlflowFeatures,
  disableMlflowFeatures,
  isMlflowOperatorManaged,
  doesMlflowCRExist,
  createMlflowExperimentViaAPI,
  deleteMlflowExperimentViaAPI,
  getMlflowExperimentIdByName,
  logMlflowRunsViaAPI,
} from '../../../utils/oc_commands/mlflow';
import { deleteOpenShiftProject, createOpenShiftProject } from '../../../utils/oc_commands/project';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { loadMlflowExperimentsFixture } from '../../../utils/dataLoader';
import { mlflowExperiments, ExperimentTypeToggle } from '../../../pages/mlflowExperiments';
import { appChrome } from '../../../pages/appChrome';
import type { MlflowExperimentsTestData } from '../../../types';

describe('Verify MLflow Experiments page', () => {
  let testData: MlflowExperimentsTestData;
  let projectName: string;
  let operatorWasManaged = true;
  let crExisted = true;
  let runsExperimentId: string | undefined;
  let uiExperimentName: string | undefined;
  let uiExperimentDeleted = false;
  const uuid = generateTestUUID();

  retryableBefore(() => {
    loadMlflowExperimentsFixture('e2e/mlflowExperiments/testMlflowExperiments.yaml')
      .then((fixtureData) => {
        testData = fixtureData;
        projectName = `${fixtureData.projectName}-${uuid}`;
        return deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true });
      })
      .then(() => createOpenShiftProject(projectName))
      .then(() =>
        isMlflowOperatorManaged().then((v) => {
          operatorWasManaged = v;
        }),
      )
      .then(() =>
        doesMlflowCRExist().then((v) => {
          crExisted = v;
          cy.step(
            `Pre-test state: operator=${operatorWasManaged ? 'Managed' : 'Removed'}, CR=${
              crExisted ? 'exists' : 'absent'
            }`,
          );
        }),
      )
      .then(() => {
        cy.step('Enable all features required for MLflow Experiments');
        return enableMlflowFeatures();
      });
  });

  after(() => {
    if (uiExperimentName && !uiExperimentDeleted) {
      getMlflowExperimentIdByName(projectName, uiExperimentName).then((id) => {
        if (id) {
          deleteMlflowExperimentViaAPI(projectName, id);
        }
      });
    }
    if (runsExperimentId) {
      deleteMlflowExperimentViaAPI(projectName, runsExperimentId);
    }
    disableMlflowFeatures(operatorWasManaged, crExisted);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Verify MLflow Experiments page',
    {
      tags: ['@Sanity', '@SanitySet1', '@MLflow', '@MLflowExperiments', '@NonConcurrent'],
    },
    () => {
      const experiment = testData.experiments[0];
      const experimentName = `${experiment.name}-${uuid}`;
      uiExperimentName = experimentName;
      const renamedExperimentName = `${experiment.renamedName}-${uuid}`;
      const runsExperimentName = `${testData.experiments[1].name}-${uuid}`;
      const [run1, run2] = testData.runs;

      // =======================================================================
      // Experiment list and search
      // =======================================================================

      cy.step('Navigate to experiments page with workspace');
      mlflowExperiments.visit(projectName);

      cy.step('Wait for embedded MLflow UI to load');
      mlflowExperiments.waitForEmbeddedContent();

      cy.step('Verify embedded MLflow UI loaded');
      mlflowExperiments.findMlflowUnavailableState().should('not.exist');

      // =======================================================================
      // Create experiment, detail view, breadcrumbs
      // =======================================================================

      cy.step('Click "Create Experiment" button');
      mlflowExperiments.findCreateExperimentButton().should('be.visible').and('be.enabled');
      mlflowExperiments.findCreateExperimentButton().click();

      cy.step('Fill in experiment name');
      mlflowExperiments.findExperimentNameInput().should('be.visible').type(experimentName);

      cy.step('Submit the create experiment form');
      mlflowExperiments.findCreateDialogSubmitButton().click();

      cy.step('Verify experiment detail heading is shown');
      mlflowExperiments.findExperimentDetailHeading(experimentName).should('be.visible');

      cy.step('Verify experiment type toggle is visible');
      mlflowExperiments
        .findExperimentTypeToggleItem(ExperimentTypeToggle.GEN_AI)
        .should('be.visible');
      mlflowExperiments
        .findExperimentTypeToggleItem(ExperimentTypeToggle.MODEL_TRAINING)
        .should('be.visible');

      cy.step('Verify GenAI toggle is selected by default');
      mlflowExperiments.shouldHaveExperimentTypeSelected(ExperimentTypeToggle.GEN_AI);

      cy.step('Verify GenAI tabs are visible');
      mlflowExperiments.findUsageTab().should('be.visible');
      mlflowExperiments.findQualityTab().should('be.visible');
      mlflowExperiments.findToolCallsTab().should('be.visible');
      mlflowExperiments.shouldHaveUsageTabSelected();

      cy.step('Verify Evaluation runs link is visible');
      mlflowExperiments.findEvaluationRunsLink().should('be.visible');

      cy.step('Switch to Model training toggle');
      mlflowExperiments.findExperimentTypeToggleItem(ExperimentTypeToggle.MODEL_TRAINING).click();
      mlflowExperiments.shouldHaveExperimentTypeSelected(ExperimentTypeToggle.MODEL_TRAINING);

      cy.step('Switch back to GenAI toggle');
      mlflowExperiments.findExperimentTypeToggleItem(ExperimentTypeToggle.GEN_AI).click();
      mlflowExperiments.shouldHaveExperimentTypeSelected(ExperimentTypeToggle.GEN_AI);

      cy.step('Verify breadcrumbs appear');
      mlflowExperiments.findBreadcrumb().scrollIntoView().should('be.visible');
      mlflowExperiments.findBreadcrumbItem('Experiments').should('be.visible');
      mlflowExperiments.findBreadcrumbItem(experimentName).should('be.visible');

      cy.step('Switch to Model training to verify runs view');
      mlflowExperiments.findExperimentTypeToggleItem(ExperimentTypeToggle.MODEL_TRAINING).click();
      mlflowExperiments.shouldHaveExperimentTypeSelected(ExperimentTypeToggle.MODEL_TRAINING);

      cy.step('Verify runs table or empty runs state is visible');
      mlflowExperiments.shouldHaveRunsTable();

      cy.step('Switch back to GenAI');
      mlflowExperiments.findExperimentTypeToggleItem(ExperimentTypeToggle.GEN_AI).click();

      cy.step('Click "Experiments" in breadcrumbs to navigate back');
      mlflowExperiments.findBreadcrumbItem('Experiments').click();

      cy.step('Verify experiment list is restored');
      mlflowExperiments.findExperimentsSearchInput().should('be.visible');

      cy.step('Navigate away to home page');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      appChrome.findMainContent().should('be.visible');

      cy.step('Navigate back to experiments page');
      mlflowExperiments.visit(projectName);

      cy.step('Verify experiment persists after navigation');
      mlflowExperiments.findExperimentInTable(experimentName).should('be.visible');

      cy.step('Search for the created experiment');
      mlflowExperiments.findExperimentsSearchInput().clear().type(`${experimentName}{enter}`);
      mlflowExperiments.findExperimentInTable(experimentName).should('be.visible');

      cy.step('Clear search and submit');
      mlflowExperiments.findExperimentsSearchInput().clear().type('{enter}');

      cy.step('Search for a non-existent experiment');
      mlflowExperiments
        .findExperimentsSearchInput()
        .clear()
        .type(`${testData.nonExistentExperiment}{enter}`);
      mlflowExperiments.findExperimentInTable(experimentName).should('not.exist');

      cy.step('Clear search to restore list');
      mlflowExperiments.findExperimentsSearchInput().clear().type('{enter}');
      mlflowExperiments.findExperimentInTable(experimentName).should('be.visible');

      // =======================================================================
      // Rename experiment
      // =======================================================================

      cy.step('Click experiment to open detail page');
      mlflowExperiments.findExperimentInTable(experimentName).click();

      cy.step('Open overflow menu on detail page');
      mlflowExperiments.findOverflowMenuTrigger().click();

      cy.step('Click rename action');
      mlflowExperiments.findRenameAction().click();

      cy.step('Clear and type new name');
      mlflowExperiments.findRenameInput().should('be.visible').clear().type(renamedExperimentName);

      cy.step('Submit rename');
      mlflowExperiments.findRenameSubmitButton().click();
      mlflowExperiments.findExperimentDetailHeading(renamedExperimentName).should('be.visible');
      uiExperimentName = renamedExperimentName;

      cy.step('Navigate back to list to verify renamed experiment');
      mlflowExperiments.findBreadcrumbItem('Experiments').click({ force: true });
      mlflowExperiments.findExperimentsSearchInput().should('be.visible');
      mlflowExperiments.findExperimentInTable(renamedExperimentName).should('be.visible');

      // =======================================================================
      // Delete experiment
      // =======================================================================

      cy.step('Click renamed experiment to open detail page');
      mlflowExperiments.findExperimentInTable(renamedExperimentName).click();

      cy.step('Open overflow menu for deletion');
      mlflowExperiments.findOverflowMenuTrigger().click();

      cy.step('Click delete action');
      mlflowExperiments.findDeleteAction().click();

      cy.step('Confirm deletion');
      mlflowExperiments.findDeleteConfirmButton().click();

      cy.step('Verify redirected to experiment list');
      mlflowExperiments.findExperimentsSearchInput().should('be.visible');

      cy.step('Verify experiment removed from list');
      mlflowExperiments.findExperimentInTable(renamedExperimentName).should('not.exist');
      uiExperimentDeleted = true;

      // =======================================================================
      // Experiment runs and comparison
      // =======================================================================

      cy.step('Create experiment and log runs via API');
      createMlflowExperimentViaAPI(projectName, runsExperimentName).then((experimentId) => {
        runsExperimentId = experimentId;
        logMlflowRunsViaAPI(projectName, experimentId, testData.runs).then(() => {
          cy.step('Navigate to experiment detail page');
          mlflowExperiments.visit(projectName);
          mlflowExperiments.findExperimentInTable(runsExperimentName).click();

          cy.step('Switch to Model training to see runs');
          mlflowExperiments
            .findExperimentTypeToggleItem(ExperimentTypeToggle.MODEL_TRAINING)
            .click();
          mlflowExperiments.shouldHaveExperimentTypeSelected(ExperimentTypeToggle.MODEL_TRAINING);

          cy.step('Verify both runs appear in the runs table');
          mlflowExperiments.findRunInTable(run1.name).should('be.visible');
          mlflowExperiments.findRunInTable(run2.name).should('be.visible');

          cy.step('Click on run 1 to view details');
          mlflowExperiments.findRunInTable(run1.name).find('a').first().click();

          cy.step('Verify run detail page loaded');
          mlflowExperiments.findExperimentDetailHeading(run1.name).should('be.visible');

          cy.step('Verify run parameters are displayed');
          mlflowExperiments.findRunParameters().scrollIntoView().should('be.visible');

          cy.step('Verify run metrics are displayed');
          mlflowExperiments.findRunMetrics().scrollIntoView().should('be.visible');

          cy.step('Navigate back to experiment via breadcrumbs');
          mlflowExperiments.findBreadcrumbItem(runsExperimentName).click();

          cy.step('Switch to Model training to see runs table');
          mlflowExperiments
            .findExperimentTypeToggleItem(ExperimentTypeToggle.MODEL_TRAINING)
            .click();
          mlflowExperiments.findRunInTable(run1.name).should('be.visible');

          cy.step('Select both runs via checkboxes');
          mlflowExperiments.findRunCheckbox(run1.name).click({ force: true });
          mlflowExperiments.findRunCheckbox(run2.name).click({ force: true });

          cy.step('Click compare button');
          mlflowExperiments.findCompareButton().click();

          cy.step('Verify compare runs page loaded without errors');
          mlflowExperiments.findCompareRunsHeading().should('be.visible');

          cy.step('Verify both runs shown in comparison');
          mlflowExperiments.shouldContainText(run1.name);
          mlflowExperiments.shouldContainText(run2.name);

          cy.step('Verify visualizations section is displayed');
          mlflowExperiments.findCompareRunsVisualizations().should('be.visible');
          mlflowExperiments.shouldContainText('accuracy');
          mlflowExperiments.shouldContainText('learning_rate');

          cy.step('Verify run details section is displayed');
          mlflowExperiments.findCompareRunDetails().should('be.visible');
        });
      });
    },
  );
});
