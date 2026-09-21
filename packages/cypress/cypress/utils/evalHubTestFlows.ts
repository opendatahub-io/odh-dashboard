import { LDAP_ADMIN_USER } from './e2eUsers';
import { ensureAdminOcSession } from './oc_commands/baseCommands';
import { deleteOpenShiftProject } from './oc_commands/project';
import {
  cleanupEvalHubMlflowExperiment,
  waitForEvaluationJobComplete,
} from './oc_commands/evalHubInstance';
import { removeEvalHubTenantLabel } from './oc_commands/evalHubModelDeploy';
import { cleanupEvalHubHardwareProfile } from './oc_commands/evalHubHardwareProfile';
import { evaluationsPage } from '../pages/evalHub/evaluationsPage';
import { createEvaluationPage } from '../pages/evalHub/createEvaluationPage';
import { evaluationResultsPage } from '../pages/evalHub/evaluationResultsPage';

export type SingleBenchmarkEvaluationOptions = {
  benchmarkCardTitle: string;
  evaluationRunName: string;
  inferenceServiceName: string;
  mlflowExperimentName: string;
  additionalBenchmarkParams?: string;
};

export type BenchmarkSuiteEvaluationOptions = {
  collectionId: string;
  collectionName: string;
  evaluationRunName: string;
  inferenceServiceName: string;
  mlflowExperimentName: string;
  additionalBenchmarkParams?: string;
};

const selectNewMlflowExperiment = (mlflowExperimentName: string): void => {
  cy.step(`Create MLflow experiment: ${mlflowExperimentName}`);
  createEvaluationPage.findExperimentModeNew().click().should('be.checked');
  createEvaluationPage
    .findNewExperimentNameInput()
    .should('be.visible')
    .clear()
    .type(mlflowExperimentName);
};

export const navigateToEvaluationsPage = (evaluationTenantProject: string): void => {
  cy.step('Log into the application and open Evaluations page');
  cy.visitWithLogin(
    evaluationsPage.pathWithLmEvalDevFlags(evaluationTenantProject),
    LDAP_ADMIN_USER,
  );
  cy.url().should('include', `/evaluation/${evaluationTenantProject}`);
  evaluationsPage
    .findPageTitle({ timeout: 30000 })
    .should('be.visible')
    .and('contain.text', 'Evaluations');
  evaluationsPage.findCreateEvaluationButton({ timeout: 30000 }).should('be.visible');
};

export const submitSingleBenchmarkEvaluation = (opts: SingleBenchmarkEvaluationOptions): void => {
  const {
    benchmarkCardTitle,
    evaluationRunName,
    inferenceServiceName,
    mlflowExperimentName,
    additionalBenchmarkParams,
  } = opts;

  cy.step('Open create evaluation wizard and select single benchmark');
  evaluationsPage.findCreateEvaluationButton().click();
  createEvaluationPage.findStandardisedBenchmarksCard().should('be.visible').click();
  cy.url().should('include', '/create/benchmarks');
  createEvaluationPage.findBenchmarksGallery({ timeout: 120000 }).should('be.visible');

  cy.step(`Select benchmark: ${benchmarkCardTitle}`);
  createEvaluationPage
    .findBenchmarkCardByTitle(benchmarkCardTitle)
    .scrollIntoView()
    .within(() => {
      createEvaluationPage.findSelectBenchmarkButton().click();
    });
  createEvaluationPage.findStartEvaluationForm({ timeout: 120000 }).should('exist');

  selectNewMlflowExperiment(mlflowExperimentName);

  cy.step('Enter evaluation name');
  createEvaluationPage.findBenchmarkNameDisplay().should('contain.text', benchmarkCardTitle);
  createEvaluationPage.findEvaluationNameInput().clear().type(evaluationRunName);

  cy.step('Select deployed model from cluster picker');
  createEvaluationPage.findModelPickerToggle().click();
  createEvaluationPage.findModelOption(inferenceServiceName).click();

  if (additionalBenchmarkParams?.trim()) {
    cy.step('Add benchmark parameters');
    createEvaluationPage.findBenchmarkParametersCheckbox().check({ force: true });
    createEvaluationPage
      .findAdditionalBenchmarkParamsTextarea()
      .should('be.visible')
      .clear()
      .type(additionalBenchmarkParams.trim(), { parseSpecialCharSequences: false });
  }

  cy.step('Submit evaluation and confirm it appears in the list');
  createEvaluationPage.findStartEvaluationSubmitButton().should('be.enabled').click();
  cy.url({ timeout: 120000 }).should('not.include', '/create');
  evaluationsPage.findEvaluationsTable().should('contain', evaluationRunName);
};

export const submitBenchmarkSuiteEvaluation = (opts: BenchmarkSuiteEvaluationOptions): void => {
  const {
    collectionId,
    collectionName,
    evaluationRunName,
    inferenceServiceName,
    mlflowExperimentName,
    additionalBenchmarkParams,
  } = opts;

  cy.step('Open create evaluation wizard and select benchmark suite');
  evaluationsPage.findCreateEvaluationButton().click();
  createEvaluationPage.findEvaluationCollectionsCard().should('be.visible').click();
  cy.url().should('include', '/create/collections');
  createEvaluationPage.findCollectionsGallery({ timeout: 120000 }).should('be.visible');

  cy.step(`Select collection: ${collectionName}`);
  createEvaluationPage
    .findCollectionCard(collectionId)
    .scrollIntoView()
    .within(() => {
      createEvaluationPage.findUseBenchmarkSuiteButton().click();
    });
  createEvaluationPage.findStartEvaluationForm({ timeout: 120000 }).should('exist');

  selectNewMlflowExperiment(mlflowExperimentName);

  cy.step('Enter evaluation name');
  createEvaluationPage.findBenchmarkNameDisplay().should('contain.text', collectionName);
  createEvaluationPage.findEvaluationNameInput().clear().type(evaluationRunName);

  cy.step('Select deployed model from cluster picker');
  createEvaluationPage.findModelPickerToggle().click();
  createEvaluationPage.findModelOption(inferenceServiceName).click();

  if (additionalBenchmarkParams?.trim()) {
    cy.step('Add benchmark parameters');
    createEvaluationPage.findBenchmarkParametersCheckbox().check({ force: true });
    createEvaluationPage
      .findAdditionalBenchmarkParamsTextarea()
      .should('be.visible')
      .clear()
      .type(additionalBenchmarkParams.trim(), { parseSpecialCharSequences: false });
  }

  cy.step('Submit evaluation and confirm it appears in the list');
  createEvaluationPage.findStartEvaluationSubmitButton().should('be.enabled').click();
  cy.url({ timeout: 120000 }).should('not.include', '/create');
  evaluationsPage.findEvaluationsTable().should('contain', evaluationRunName);
};

export const verifyEvaluationProgressModal = (evaluationRunName: string): void => {
  cy.step('Open status modal and verify progress tab is visible');
  evaluationsPage.findEvaluationStatusButtonInRow(evaluationRunName).click();
  evaluationsPage.findStatusModal().should('be.visible');
  evaluationsPage.findStatusModalProgressContent().should('be.visible');

  cy.step('Switch to events log tab and verify it activates without error');
  evaluationsPage.findStatusModalEventsLogTab().click();
  evaluationsPage.findStatusModalEventsLogTab().should('have.attr', 'aria-selected', 'true');
  evaluationsPage.findStatusModalCloseButton().click();
  evaluationsPage.findStatusModal().should('not.exist');
};

export const verifyEvaluationCompletedAndViewResults = (
  evaluationRunName: string,
  evaluationTenantProject: string,
  expectedBenchmarkIds: string[] = [],
): void => {
  cy.step('Re-open status modal after completion — View Results shown, Stop absent');
  cy.reload();
  evaluationsPage.findPageTitle({ timeout: 30000 }).should('be.visible');
  evaluationsPage.findEvaluationStatusButtonInRow(evaluationRunName).click();
  evaluationsPage.findStatusModal().should('be.visible');
  evaluationsPage.findStatusModalStopButton().should('not.exist');
  evaluationsPage.findStatusModalViewResultsButton().should('be.visible').click();

  cy.step('Verify evaluation results page renders with score and metadata');
  evaluationResultsPage.findResultsContent().should('be.visible');
  evaluationResultsPage.findScoreValue().should('be.visible');
  evaluationResultsPage.findMetadata().should('be.visible');
  evaluationResultsPage.findBenchmarkDetailsInfo().should('be.visible');

  if (expectedBenchmarkIds.length > 0) {
    cy.step(`Verify all ${expectedBenchmarkIds.length} benchmark results are displayed`);
    evaluationResultsPage.findBenchmarksGrid().should('be.visible');
    evaluationResultsPage
      .findBenchmarkResultCards()
      .should('have.length', expectedBenchmarkIds.length);
    expectedBenchmarkIds.forEach((benchmarkId) => {
      evaluationResultsPage
        .findBenchmarkResultCardById(benchmarkId)
        .should('have.length', 1)
        .and('be.visible');
    });
  }

  cy.step('Verify About this result popover opens');
  evaluationResultsPage.findFirstAboutResultButton().click();
  evaluationResultsPage.findAboutResultDialog().should('be.visible');
  evaluationResultsPage.findAboutResultCloseButton().click();

  cy.step('Open event log modal and verify it renders');
  evaluationResultsPage.findViewLogButton().click();
  evaluationResultsPage.findEventLogModal().should('be.visible');
  evaluationResultsPage.findLogContent().should('be.visible');
  evaluationResultsPage.findEventLogModalCloseButton().click();

  cy.step('Return to evaluations list and verify Complete status');
  cy.visitWithLogin(
    evaluationsPage.pathWithLmEvalDevFlags(evaluationTenantProject),
    LDAP_ADMIN_USER,
  );
  evaluationsPage
    .findEvaluationStatusButtonInRow(evaluationRunName)
    .should('contain.text', 'Complete');
};

export const stopAndReconfigureEvaluation = (
  evaluationRunName: string,
  reconfiguredRunName: string,
): void => {
  cy.step('Wait for evaluation to reach Running status');
  evaluationsPage
    .findEvaluationStatusButtonInRow(evaluationRunName, { timeout: 120000 })
    .should('contain.text', 'Running');

  cy.step('Open status modal and stop the running evaluation');
  evaluationsPage.findEvaluationStatusButtonInRow(evaluationRunName, { timeout: 120000 }).click();
  evaluationsPage.findStatusModal().should('be.visible');
  evaluationsPage
    .findStatusModalStopButton({ timeout: 120000 })
    .should('be.visible')
    .and('be.enabled')
    .click();

  cy.step('Confirm stop in the stop evaluation modal');
  evaluationsPage.findStopModal().should('be.visible');
  evaluationsPage.findStopConfirmButton().click();
  evaluationsPage.findStopModal().should('not.exist');

  cy.step('Wait for evaluation to reach Canceled status');
  cy.reload();
  evaluationsPage.findPageTitle({ timeout: 30000 }).should('be.visible');
  evaluationsPage
    .findEvaluationStatusButtonInRow(evaluationRunName, { timeout: 120000 })
    .should('contain.text', 'Canceled');

  cy.step('Open status modal and click Reconfigure');
  evaluationsPage.findEvaluationStatusButtonInRow(evaluationRunName).click();
  evaluationsPage.findStatusModal().should('be.visible');
  evaluationsPage.findStatusModalReconfigureButton().should('be.visible').click();

  cy.step(`Submit the reconfigured evaluation run as "${reconfiguredRunName}"`);
  cy.url().should('include', '/reconfigure');
  createEvaluationPage.findStartEvaluationForm({ timeout: 30000 }).should('exist');
  createEvaluationPage.findEvaluationNameInput().clear().type(reconfiguredRunName);
  createEvaluationPage.findStartEvaluationSubmitButton().should('be.enabled').click();
  cy.url({ timeout: 120000 }).should('not.include', '/reconfigure');
  evaluationsPage.findEvaluationsTable({ timeout: 30000 }).should('contain', reconfiguredRunName);
};

export const runSingleBenchmarkEvaluationFlow = (
  evaluationTenantProject: string,
  opts: SingleBenchmarkEvaluationOptions,
): void => {
  navigateToEvaluationsPage(evaluationTenantProject);
  submitSingleBenchmarkEvaluation(opts);
  verifyEvaluationProgressModal(opts.evaluationRunName);
  waitForEvaluationJobComplete(evaluationTenantProject);
  verifyEvaluationCompletedAndViewResults(opts.evaluationRunName, evaluationTenantProject);
};

export type EvalHubCleanupStep = {
  description: string;
  run: () => Cypress.Chainable | void;
};

export type EvalHubCleanupOptions = {
  evaluationTenantProject: string;
  mlflowExperimentName: string;
  hardwareProfileName: string;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Builds the shared cleanup sequence used by the live EvalHub specs. */
export const createEvalHubCleanupSteps = ({
  evaluationTenantProject,
  mlflowExperimentName,
  hardwareProfileName,
}: EvalHubCleanupOptions): EvalHubCleanupStep[] => {
  const cleanupSteps: EvalHubCleanupStep[] = [];

  if (evaluationTenantProject && mlflowExperimentName) {
    cleanupSteps.push({
      description: `Delete MLflow experiment ${mlflowExperimentName}`,
      run: () => {
        cy.step(`Delete MLflow experiment: ${mlflowExperimentName}`);
        return cleanupEvalHubMlflowExperiment(evaluationTenantProject, mlflowExperimentName);
      },
    });
  }

  if (evaluationTenantProject) {
    cleanupSteps.push({
      description: `Remove EvalHub tenant label from ${evaluationTenantProject}`,
      run: () => removeEvalHubTenantLabel(evaluationTenantProject),
    });
    cleanupSteps.push({
      description: `Delete tenant project ${evaluationTenantProject}`,
      run: () => {
        cy.step(`Delete tenant project: ${evaluationTenantProject}`);
        return deleteOpenShiftProject(evaluationTenantProject, {
          wait: true,
          ignoreNotFound: true,
        });
      },
    });
  }

  if (hardwareProfileName) {
    cleanupSteps.push({
      description: `Clean up Hardware Profile ${hardwareProfileName}`,
      run: () => {
        cy.step(`Clean up Hardware Profile: ${hardwareProfileName}`);
        return cleanupEvalHubHardwareProfile(hardwareProfileName);
      },
    });
  }

  return cleanupSteps;
};

/** Runs every cleanup step and reports all failures after the final attempt. */
export const runEvalHubCleanup = (steps: EvalHubCleanupStep[]): void => {
  const failures: string[] = [];
  let activeDescription = '';

  const recordFailure = (description: string, error: unknown): void => {
    failures.push(`${description}: ${getErrorMessage(error)}`);
  };

  const handleCypressFailure = (error: Cypress.CypressError): false | void => {
    if (!activeDescription) {
      throw error;
    }
    recordFailure(activeDescription, error);
    activeDescription = '';
    return false;
  };

  Cypress.on('fail', handleCypressFailure);

  steps.forEach(({ description, run }) => {
    cy.then(() => {
      activeDescription = description;
      try {
        return run();
      } catch (error) {
        recordFailure(description, error);
        activeDescription = '';
        return undefined;
      }
    }).then(() => {
      activeDescription = '';
    });
  });

  cy.then(() => {
    Cypress.off('fail', handleCypressFailure);
    if (failures.length > 0) {
      throw new Error(`EvalHub cleanup failed:\n${failures.join('\n')}`);
    }
  });
};

export const cleanupEvalHubTestResources = (options: EvalHubCleanupOptions): void => {
  ensureAdminOcSession();
  runEvalHubCleanup(createEvalHubCleanupSteps(options));
};
