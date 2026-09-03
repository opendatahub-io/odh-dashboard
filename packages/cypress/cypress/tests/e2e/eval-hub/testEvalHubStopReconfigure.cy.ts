import * as yaml from 'js-yaml';
import {
  navigateToEvaluationsPage,
  submitSingleBenchmarkEvaluation,
  stopAndReconfigureEvaluation,
} from '../../../utils/evalHubTestFlows';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { addUserToProject, deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { cleanupHardwareProfiles } from '../../../utils/oc_commands/hardwareProfiles';
import type { EvalHubTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import { ensureEvalHubCrReady } from '../../../utils/oc_commands/evalHubInstance';
import { ensureMlflowCrReady } from '../../../utils/oc_commands/mlflow';
import {
  grantEvalHubTenantAccess,
  setupTenantAndDeployModel,
} from '../../../utils/oc_commands/evalHubModelDeploy';

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
  let additionalBenchmarkParams = '';
  let projectNamePrefix = '';

  retryableBefore(() => {
    ensureAdminOcSession();
    cy.fixture('e2e/eval-hub/testEvalHubStopReconfigure.yaml', 'utf8').then(
      (yamlContent: string) => {
        testData = yaml.load(yamlContent) as EvalHubTestData;
        evalHubCrName = testData.evalHubCrName;
        hardwareProfileName = testData.hardwareProfileName;
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
      cy.exec(
        `oc label namespace ${evaluationTenantProject} evalhub.trustyai.opendatahub.io/tenant- --ignore-not-found`,
        { failOnNonZeroExit: false },
      );
      deleteOpenShiftProject(evaluationTenantProject, { wait: true, ignoreNotFound: true });
    }

    if (hardwareProfileName) {
      cy.step(`Clean up Hardware Profile: ${hardwareProfileName}`);
      cleanupHardwareProfiles(hardwareProfileName);
    }
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

      navigateToEvaluationsPage(evaluationTenantProject);
      submitSingleBenchmarkEvaluation({
        benchmarkCardTitle,
        evaluationRunName,
        inferenceServiceName,
        additionalBenchmarkParams,
      });
      stopAndReconfigureEvaluation(evaluationRunName, reconfiguredRunName);
    },
  );
});
