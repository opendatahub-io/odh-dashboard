import * as yaml from 'js-yaml';
import {
  clearEvalHubEvaluationJobs,
  cleanupEvalHubTestResources,
  navigateToEvaluationsPage,
  submitSingleBenchmarkEvaluation,
  stopAndReconfigureEvaluation,
} from '../../../utils/evalHubTestFlows';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { addUserToProject } from '../../../utils/oc_commands/project';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { EvalHubTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import { ensureEvalHubCrReady } from '../../../utils/oc_commands/evalHubInstance';
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
 * Live-cluster Eval Hub E2E — stop and reconfigure flow.
 * Submits a single benchmark evaluation, stops it while running, then
 * reconfigures it with a new name and resubmits.
 *
 * EvalHub and MLflow CRs are treated as shared cluster infrastructure and are never
 * deleted by this suite.
 */
describe('Eval Hub E2E — Stop and Reconfigure', () => {
  let testData: EvalHubTestData;
  const uuid = Cypress.env('EVAL_HUB_RECONFIG_UUID') || generateTestUUID();
  Cypress.env('EVAL_HUB_RECONFIG_UUID', uuid);
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
    cy.fixture('e2e/eval-hub/testEvalHubStopReconfigure.yaml', 'utf8').then(
      (yamlContent: string) => {
        testData = yaml.load(yamlContent) as EvalHubTestData;
        evalHubCrName = testData.evalHubCrName;
        hardwareProfileName = getEvalHubHardwareProfileName(uuid);
        evalHubInstanceYamlPath = testData.evalHubInstanceResourceYamlPath;
        mlflowInstanceYamlPath = testData.mlflowInstanceResourceYamlPath;
        benchmarkCardTitle = testData.benchmarkCardTitle;
        additionalBenchmarkParams = testData.additionalBenchmarkParams;
        projectNamePrefix = testData.projectNamePrefix;
        evaluationTenantProject = `${testData.projectNamePrefix}-reconfig-${uuid}`;
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
    'Eval Hub: stop a running evaluation and resubmit via reconfigure',
    {
      retries: { runMode: 0, openMode: 0 },
      tags: ['@EvalHub', '@Featureflagged'],
    },
    () => {
      const evaluationRunName = `e2e-reconfig-${evaluationTenantProject.replace(
        `${projectNamePrefix}-reconfig-`,
        '',
      )}`;
      const reconfiguredRunName = `${evaluationRunName}-v2`;

      submitSingleBenchmarkEvaluation({
        benchmarkCardTitle,
        evaluationRunName,
        inferenceServiceName,
        mlflowExperimentName,
        additionalBenchmarkParams,
      });
      stopAndReconfigureEvaluation(evaluationRunName, reconfiguredRunName);
    },
  );
});
