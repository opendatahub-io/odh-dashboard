import * as yaml from 'js-yaml';
import {
  navigateToEvaluationsPage,
  submitSingleBenchmarkEvaluation,
  verifyEvaluationProgressModal,
  verifyEvaluationCompletedAndViewResults,
} from '../../../utils/evalHubTestFlows';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { addUserToProject, deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { cleanupHardwareProfiles } from '../../../utils/oc_commands/hardwareProfiles';
import type { EvalHubTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  ensureEvalHubCrReady,
  waitForEvaluationJobComplete,
} from '../../../utils/oc_commands/evalHubInstance';
import { ensureMlflowCrReady } from '../../../utils/oc_commands/mlflowInstance';
import {
  grantEvalHubTenantAccess,
  setupTenantAndDeployModel,
} from '../../../utils/oc_commands/evalHubModelDeploy';

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
  let additionalBenchmarkParams = '';
  let projectNamePrefix = '';

  retryableBefore(() => {
    ensureAdminOcSession();
    cy.fixture('e2e/eval-hub/testEvalHub.yaml', 'utf8').then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as EvalHubTestData;
      evalHubCrName = testData.evalHubCrName;
      hardwareProfileName = testData.hardwareProfileName;
      evalHubInstanceYamlPath = testData.evalHubInstanceResourceYamlPath;
      mlflowInstanceYamlPath = testData.mlflowInstanceResourceYamlPath;
      benchmarkCardTitle = testData.benchmarkCardTitle;
      additionalBenchmarkParams = testData.additionalBenchmarkParams;
      projectNamePrefix = testData.projectNamePrefix;
      evaluationTenantProject = `${testData.projectNamePrefix}-${uuid}`;
    });

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

    cy.then(() => {
      cy.step('[Setup] Deploy vLLM model and configure tenant access');
      addUserToProject(evaluationTenantProject, LDAP_ADMIN_USER.USERNAME, 'admin');
      setupTenantAndDeployModel(evaluationTenantProject, testData, hardwareProfileName);
      grantEvalHubTenantAccess(evaluationTenantProject, LDAP_ADMIN_USER.USERNAME);
      inferenceServiceName = testData.inferenceServiceName;
      cy.log(`InferenceService: ${inferenceServiceName}`);
    });
  });

  after(() => {
    ensureAdminOcSession();

    if (evaluationTenantProject) {
      cy.step(`Delete tenant project: ${evaluationTenantProject}`);
      deleteOpenShiftProject(evaluationTenantProject, { wait: false, ignoreNotFound: true });
    }

    if (hardwareProfileName) {
      cy.step(`Clean up Hardware Profile: ${hardwareProfileName}`);
      cleanupHardwareProfiles(hardwareProfileName);
    }
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

      navigateToEvaluationsPage(evaluationTenantProject);
      submitSingleBenchmarkEvaluation({
        benchmarkCardTitle,
        evaluationRunName,
        inferenceServiceName,
        additionalBenchmarkParams,
      });
      verifyEvaluationProgressModal(evaluationRunName);
      waitForEvaluationJobComplete(evaluationTenantProject);
      verifyEvaluationCompletedAndViewResults(evaluationRunName, evaluationTenantProject);
    },
  );
});
