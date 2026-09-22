import { waitForMlflowBffConfigured } from './oc_commands/mlflow';
import { waitForKfpRunSucceeded } from './oc_commands/pipelineRuns';
import {
  pipelinesTable,
  pipelineDetails,
  pipelineImportModal,
  pipelinesGlobal,
  pipelineRunsGlobal,
  createRunPage,
  activeRunsTable,
} from '../pages/pipelines';
import type { MlflowIrisRunData } from '../types';

export const MLFLOW_UI_TIMEOUT_MS = 60000;
export const MLFLOW_COMPARE_RUNS_PATH = '/develop-train/mlflow/experiments/compare-runs';

/**
 * INTEGER params render PatternFly NumberInput: data-testid is on the wrapper,
 * and clear() normalizes empty to 0 so a later type() can become "30" instead of "3".
 */
const fillIntegerRunParam = (id: string, value: string): void => {
  createRunPage
    .getParamsSection()
    .findParamById(id)
    .find('input')
    .type('{selectall}', { parseSpecialCharSequences: true })
    .type(value, { parseSpecialCharSequences: false })
    .should('have.value', value);
};

/** Fill the iris pipeline's run parameters. */
export const fillMlflowIrisRunParams = (run: MlflowIrisRunData): void => {
  fillIntegerRunParam('neighbors', run.neighbors);
  createRunPage
    .getParamsSection()
    .findParamById(`radio-standard_scaler-${run.standardScaler}`)
    .click();
};

/** Select an existing MLflow experiment by name in the create-run MLflow section. */
export const selectExistingMlflowExperiment = (name: string): void => {
  createRunPage.findMlflowExistingRadio().click();
  createRunPage.mlflowExperimentSelect.findToggleButton().click();
  createRunPage.selectMlflowExperimentByName(name);
};

/** Fill the create-run form for an iris run, submit, and wait until the KFP run succeeds. */
export const fillAndSubmitMlflowIrisRun = (
  run: MlflowIrisRunData,
  experimentName: string,
  mlflow:
    | { newExperimentName: string; existingExperimentName?: never }
    | { existingExperimentName: string; newExperimentName?: never },
  projectName: string,
  timeout: number,
): void => {
  createRunPage.find().should('exist');
  createRunPage.fillRunGroup(experimentName);
  createRunPage.fillName(run.name);
  createRunPage.fillDescription(run.description);
  createRunPage
    .findMlflowIntegrationSection({ timeout: MLFLOW_UI_TIMEOUT_MS })
    .scrollIntoView()
    .should('be.visible');
  if (mlflow.newExperimentName != null) {
    createRunPage.findMlflowNewRadio().click();
    createRunPage.findMlflowNewExperimentNameInput().clear().type(mlflow.newExperimentName);
  } else {
    selectExistingMlflowExperiment(mlflow.existingExperimentName);
  }
  fillMlflowIrisRunParams(run);
  createRunPage.findSubmitButton().click();
  waitForMlflowRunSucceeded(projectName, timeout);
};

const openPipelineDetails = (pipelineName: string): void => {
  pipelineDetails.findPageTitle(MLFLOW_UI_TIMEOUT_MS).should(($title) => {
    if ($title.text().trim() === pipelineName) {
      return;
    }
    expect(
      $title
        .closest('body')
        .find('[data-testid="pipelines-table"] a')
        .filter((_, el) => (el.textContent || '').trim() === pipelineName).length,
      `pipelines-table link for ${pipelineName}`,
    ).to.be.greaterThan(0);
  });
  pipelineDetails.findPageTitle().then(($title) => {
    if ($title.text().trim() === pipelineName) {
      return;
    }
    pipelinesTable.findPipelineLinkByName(pipelineName, MLFLOW_UI_TIMEOUT_MS).click();
  });
  pipelineDetails.findPageTitle(MLFLOW_UI_TIMEOUT_MS).should('have.text', pipelineName);
};

/** Import a pipeline from a local YAML file and wait for its details page. */
export const importMlflowPipelineFromFile = (
  name: string,
  description: string,
  yamlPath: string,
): void => {
  pipelinesGlobal.findImportPipelineButton(MLFLOW_UI_TIMEOUT_MS).click();
  pipelineImportModal.findPipelineNameInput().type(name);
  pipelineImportModal.findPipelineDescriptionInput().type(description);
  pipelineImportModal.findUploadPipelineRadio().click();
  pipelineImportModal.uploadPipelineYaml(yamlPath);
  pipelineImportModal.submit();
  pipelineImportModal.shouldCloseWithoutError(MLFLOW_UI_TIMEOUT_MS);
  openPipelineDetails(name);
};

/**
 * Create-run from pipeline details (client-side) is the path that actually
 * renders the MLflow section on this cluster. A full visit of the runs page
 * resets useMLflowStatus; even a 60s wait never saw the section afterwards.
 */
export const createMlflowRunFromPipelineDetails = (
  pipelineName: string,
  projectName: string,
): void => {
  pipelinesGlobal.visit(projectName, MLFLOW_UI_TIMEOUT_MS);
  waitForMlflowBffConfigured(MLFLOW_UI_TIMEOUT_MS);
  openPipelineDetails(pipelineName);
  pipelineDetails.selectActionDropdownItem('Create run');
  createRunPage.find().should('exist');
};

/**
 * After submit, wait for the run-details URL (not /create), then poll that
 * run's Argo workflow via oc until Succeeded.
 */
export const waitForMlflowRunSucceeded = (projectName: string, timeout: number): void => {
  cy.location('pathname', { timeout: MLFLOW_UI_TIMEOUT_MS })
    .should((pathname) => {
      const runId = pathname.split('/').filter(Boolean).pop() ?? '';
      expect(runId, `run details URL, got ${pathname}`).to.not.eq('create');
      expect(runId.length, `run details URL, got ${pathname}`).to.be.greaterThan(0);
    })
    .then((pathname) => {
      const runId = pathname.split('/').filter(Boolean).pop() ?? '';
      waitForKfpRunSucceeded(projectName, runId, timeout);
    });
};

/** Assert that submitting the compare-runs action redirected to the MLflow compare-runs page. */
export const expectMlflowCompareRunsRedirect = (
  projectName: string,
  options: { exactRunCount?: number; minRunCount?: number },
): void => {
  cy.location('pathname').should('eq', MLFLOW_COMPARE_RUNS_PATH);
  cy.location('search').should((search) => {
    const params = new URLSearchParams(search);
    expect(params.get('workspace')).to.eq(projectName);

    const runs = JSON.parse(params.get('runs') ?? '[]') as string[];
    const experiments = JSON.parse(params.get('experiments') ?? '[]') as string[];
    expect(experiments.length).to.be.greaterThan(0);

    if (options.exactRunCount != null) {
      expect(runs).to.have.length(options.exactRunCount);
    }
    if (options.minRunCount != null) {
      expect(runs.length).to.be.at.least(options.minRunCount);
    }
  });
};

export const waitForMlflowExperimentLink = (runName: string, timeout = 60000): void => {
  activeRunsTable
    .getRowByName(runName)
    .find()
    .findByTestId('mlflow-experiment-link', { timeout })
    .should('exist');
};

/**
 * Wait for the compare-runs button to link to MLflow.
 */
export const waitForMlflowCompareRunsButton = (timeout = 180000): void => {
  pipelineRunsGlobal.findCompareRunsButton(timeout).should(($btn) => {
    const href = $btn.closest('a').attr('href') ?? $btn.attr('href') ?? '';
    expect(href, 'compare-runs-button href').to.include('/mlflow/');
  });
};
