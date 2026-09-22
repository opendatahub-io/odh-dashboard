import * as yaml from 'js-yaml';
import {
  cleanupEvalHubTestResources,
  navigateToEvaluationsPage,
  submitBenchmarkSuiteEvaluation,
  verifyEvaluationProgressModal,
  verifyEvaluationCompletedAndViewResults,
} from '../../../utils/evalHubTestFlows';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { addUserToProject } from '../../../utils/oc_commands/project';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { EvalHubBenchmarkSuiteTestData } from '../../../types';
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

/**
 * Live-cluster Eval Hub E2E — benchmark suite (collection) flow.
 * Selects the "Toxicity and Ethical Principles" collection (toxigen, truthfulqa_mc1,
 * bigbench_hhh) to exercise the multi-benchmark collection path end-to-end.
 *
 * EvalHub and MLflow CRs are treated as shared cluster infrastructure and are never
 * deleted by this suite.
 */
describe('Eval Hub E2E — Benchmark Suite', () => {
  let testData: EvalHubBenchmarkSuiteTestData;
  const uuid = Cypress.env('EVAL_HUB_SUITE_UUID') || generateTestUUID();
  Cypress.env('EVAL_HUB_SUITE_UUID', uuid);
  let evaluationTenantProject = '';
  let evalHubCrName = 'evalhub';
  let hardwareProfileName = '';
  let inferenceServiceName = '';
  let evalHubInstanceYamlPath = '';
  let mlflowInstanceYamlPath = '';
  let collectionId = '';
  let collectionName = '';
  let expectedBenchmarkIds: string[] = [];
  let mlflowExperimentName = '';
  let additionalBenchmarkParams = '';
  let projectNamePrefix = '';

  retryableBefore(() => {
    ensureAdminOcSession();
    cy.fixture('e2e/eval-hub/testEvalHubBenchmarkSuite.yaml', 'utf8').then(
      (yamlContent: string) => {
        testData = yaml.load(yamlContent) as EvalHubBenchmarkSuiteTestData;
        evalHubCrName = testData.evalHubCrName;
        hardwareProfileName = getEvalHubHardwareProfileName(uuid);
        evalHubInstanceYamlPath = testData.evalHubInstanceResourceYamlPath;
        mlflowInstanceYamlPath = testData.mlflowInstanceResourceYamlPath;
        collectionId = testData.collectionId;
        collectionName = testData.collectionName;
        expectedBenchmarkIds = testData.expectedBenchmarkIds;
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
  });

  after(() => {
    cleanupEvalHubTestResources({
      evaluationTenantProject,
      mlflowExperimentName,
      hardwareProfileName,
    });
  });

  it(
    'Eval Hub: start benchmark suite evaluation and see it complete',
    {
      retries: { runMode: 0, openMode: 0 },
      tags: ['@EvalHub', '@Featureflagged'],
    },
    () => {
      const evaluationRunName = `e2e-suite-${evaluationTenantProject.replace(
        `${projectNamePrefix}-`,
        '',
      )}`;

      navigateToEvaluationsPage(evaluationTenantProject);
      submitBenchmarkSuiteEvaluation({
        collectionId,
        collectionName,
        evaluationRunName,
        inferenceServiceName,
        mlflowExperimentName,
        additionalBenchmarkParams,
      });
      verifyEvaluationProgressModal(evaluationRunName);
      waitForEvaluationJobComplete(evaluationTenantProject, 1800000);
      verifyEvaluationCompletedAndViewResults(
        evaluationRunName,
        evaluationTenantProject,
        expectedBenchmarkIds,
      );
    },
  );
});
