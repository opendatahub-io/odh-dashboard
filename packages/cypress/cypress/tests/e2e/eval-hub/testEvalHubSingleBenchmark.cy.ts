import * as yaml from 'js-yaml';
import {
  clearEvalHubEvaluationJobs,
  cleanupEvalHubTestResources,
  navigateToEvaluationsPage,
  submitSingleBenchmarkEvaluation,
  verifyEvaluationProgressModal,
  verifyEvaluationCompletedAndViewResults,
} from '../../../utils/evalHubTestFlows';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { addUserToProject } from '../../../utils/oc_commands/project';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { EvalHubTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  ensureEvalHubCrReady,
  waitForEvaluationJobComplete,
} from '../../../utils/oc_commands/evalHubInstance';
import {
  ensureMlflowCrReady,
  findAvailableExperimentSuffix,
} from '../../../utils/oc_commands/mlflow';
import {
  grantEvalHubTenantAccess,
  setupTenantAndDeployModel,
} from '../../../utils/oc_commands/evalHubModelDeploy';
import { getEvalHubHardwareProfileName } from '../../../utils/oc_commands/evalHubHardwareProfile';
import { provisionEvalHubOfflineDataSecret } from '../../../utils/oc_commands/evalHubOfflineData';

/**
 * Live-cluster Eval Hub E2E. Ensures EvalHub + MLflow CRs are Ready, creates an ephemeral
 * OpenShift project with a vLLM-served model, then drives the Evaluations UI to submit an
 * inference evaluation and verify it completes.
 *
 * EvalHub and MLflow CRs are never deleted by this suite — they are treated as shared cluster
 * infrastructure. ensureEvalHubCrReady / ensureMlflowCrReady create them on first run if
 * absent and are no-ops on subsequent runs, making concurrent execution safe.
 */
describe('Eval Hub E2E', () => {
  let testData: EvalHubTestData;
  const uuid = Cypress.env('EVAL_HUB_UUID') || generateTestUUID();
  Cypress.env('EVAL_HUB_UUID', uuid);
  let evaluationTenantProject = '';
  let evalHubCrName = 'evalhub';
  let hardwareProfileName = '';
  let inferenceServiceName = '';
  let evalHubInstanceYamlPath = '';
  let mlflowInstanceYamlPath = '';
  let benchmarkCardTitle = '';
  let mlflowExperimentName = '';
  let additionalBenchmarkParams = '';
  let projectNamePrefix = '';

  retryableBefore(() => {
    ensureAdminOcSession();
    cy.fixture('e2e/eval-hub/testEvalHubSingleBenchmark.yaml', 'utf8').then(
      (yamlContent: string) => {
        testData = yaml.load(yamlContent) as EvalHubTestData;
        evalHubCrName = testData.evalHubCrName;
        hardwareProfileName = getEvalHubHardwareProfileName(uuid);
        evalHubInstanceYamlPath = testData.evalHubInstanceResourceYamlPath;
        mlflowInstanceYamlPath = testData.mlflowInstanceResourceYamlPath;
        benchmarkCardTitle = testData.benchmarkCardTitle;
        additionalBenchmarkParams = testData.additionalBenchmarkParams;
        projectNamePrefix = testData.projectNamePrefix;
        evaluationTenantProject = `${testData.projectNamePrefix}-${uuid}`;
      },
    );

    cy.then(() => {
      cy.step('[Setup] Provision MLflow instance');
      return ensureMlflowCrReady(mlflowInstanceYamlPath);
    });

    cy.then(() => {
      cy.step('[Setup] Provision EvalHub instance');
      return ensureEvalHubCrReady(evalHubCrName, evalHubInstanceYamlPath);
    });

    cy.then(() => {
      cy.step(`[Setup] Create tenant project: ${evaluationTenantProject}`);
      createCleanProject(evaluationTenantProject);
    });

    cy.then(() => provisionEvalHubOfflineDataSecret(evaluationTenantProject));

    cy.then(() => {
      cy.step('[Setup] Deploy vLLM model and configure tenant access');
      addUserToProject(evaluationTenantProject, LDAP_ADMIN_USER.USERNAME, 'admin');
      setupTenantAndDeployModel(evaluationTenantProject, testData, hardwareProfileName);
      grantEvalHubTenantAccess(evaluationTenantProject, LDAP_ADMIN_USER.USERNAME);
      inferenceServiceName = testData.inferenceServiceName;
      cy.log(`InferenceService: ${inferenceServiceName}`);
    });

    cy.then(() => {
      cy.step('[Setup] Select an available MLflow experiment name');
      return findAvailableExperimentSuffix(
        evaluationTenantProject,
        [testData.mlflowExperimentName],
        uuid,
      ).then((suffix) => {
        mlflowExperimentName = `${testData.mlflowExperimentName}-${suffix}`;
        cy.log(`MLflow experiment: ${mlflowExperimentName}`);
      });
    });

    cy.then(() => {
      cy.step('[Setup] Open EvalHub and remove stale evaluation runs');
      navigateToEvaluationsPage(evaluationTenantProject);
      clearEvalHubEvaluationJobs(evaluationTenantProject);
    });
  });

  after(() => {
    cleanupEvalHubTestResources({
      evaluationTenantProject,
      mlflowExperimentName,
      hardwareProfileName,
    });
  });

  it(
    'Eval Hub: start inference evaluation and see it complete',
    {
      retries: { runMode: 0, openMode: 0 },
      tags: ['@EvalHub', '@EvalHubCI', '@Featureflagged'],
    },
    () => {
      const evaluationRunName = `e2e-eval-${evaluationTenantProject.replace(
        `${projectNamePrefix}-`,
        '',
      )}`;

      submitSingleBenchmarkEvaluation({
        benchmarkCardTitle,
        evaluationRunName,
        inferenceServiceName,
        mlflowExperimentName,
        additionalBenchmarkParams,
      });
      verifyEvaluationProgressModal(evaluationRunName);
      waitForEvaluationJobComplete(evaluationTenantProject);
      verifyEvaluationCompletedAndViewResults(evaluationRunName, evaluationTenantProject);
    },
  );
});
