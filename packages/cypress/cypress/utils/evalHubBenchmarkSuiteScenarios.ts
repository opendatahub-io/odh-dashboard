import * as yaml from 'js-yaml';
import { LDAP_ADMIN_USER } from './e2eUsers';
import {
  clearEvalHubEvaluationJobs,
  cleanupEvalHubTestResources,
  createBenchmarkSuite,
  deleteEvalHubTenantCollections,
  findAvailableBenchmarkSuiteExperimentSuffix,
  findEvalHubCollectionIdByName,
  navigateToEvaluationsPage,
  submitBenchmarkSuiteEvaluation,
  submitCreatedBenchmarkSuiteEvaluation,
  verifyEvaluationCompletedAndViewResults,
  verifyEvaluationProgressModal,
} from './evalHubTestFlows';
import { createCleanProject } from './projectChecker';
import { generateTestUUID } from './uuidGenerator';
import { ensureAdminOcSession } from './oc_commands/baseCommands';
import { ensureEvalHubCrReady, waitForEvaluationJobComplete } from './oc_commands/evalHubInstance';
import { getEvalHubHardwareProfileName } from './oc_commands/evalHubHardwareProfile';
import { provisionEvalHubOfflineDataSecret } from './oc_commands/evalHubOfflineData';
import {
  grantEvalHubTenantAccess,
  setupTenantAndDeployModel,
} from './oc_commands/evalHubModelDeploy';
import { ensureMlflowCrReady } from './oc_commands/mlflow';
import { addUserToProject } from './oc_commands/project';
import type { EvalHubBenchmarkSuiteTestData } from '../types';

export type BenchmarkSuiteScenarioKey = 'save-and-run' | 'gallery';

export type EvalHubBenchmarkSuiteScenario = {
  setup: () => void;
  cleanup: () => void;
  run: () => void;
};

const getScenarioUuid = (key: BenchmarkSuiteScenarioKey): string => {
  const envKey =
    key === 'save-and-run' ? 'EVAL_HUB_SUITE_SAVE_AND_RUN_UUID' : 'EVAL_HUB_SUITE_GALLERY_UUID';
  const uuid = Cypress.env(envKey) || generateTestUUID();
  Cypress.env(envKey, uuid);
  return uuid;
};

/**
 * Creates the independently provisioned lifecycle shared by each benchmark-suite spec.
 * Separate tenants keep failures and cleanup in one journey from affecting the other.
 */
export const createEvalHubBenchmarkSuiteScenario = (
  key: BenchmarkSuiteScenarioKey,
): EvalHubBenchmarkSuiteScenario => {
  let testData: EvalHubBenchmarkSuiteTestData;
  const scenarioUuid = getScenarioUuid(key);
  const runAfterSave = key === 'save-and-run';
  let evaluationTenantProject = '';
  let hardwareProfileName = '';
  let inferenceServiceName = '';
  let createdSuiteName = '';
  let experimentName = '';
  const createdCollectionIds: string[] = [];

  const trackCreatedCollectionId = (): void => {
    findEvalHubCollectionIdByName(evaluationTenantProject, createdSuiteName).then((id) => {
      if (!createdCollectionIds.includes(id)) {
        createdCollectionIds.push(id);
      }
    });
  };

  const setup = (): void => {
    ensureAdminOcSession();
    cy.fixture('e2e/eval-hub/testEvalHubBenchmarkSuite.yaml', 'utf8').then(
      (yamlContent: string) => {
        testData = yaml.load(yamlContent) as EvalHubBenchmarkSuiteTestData;
        hardwareProfileName = getEvalHubHardwareProfileName(scenarioUuid);
        evaluationTenantProject = `${testData.projectNamePrefix}-${scenarioUuid}`;
        createdSuiteName = `${testData.suiteName}-${scenarioUuid}`;
        inferenceServiceName = testData.inferenceServiceName;
      },
    );

    cy.then(() => {
      cy.step('[Setup] Provision MLflow instance');
      return ensureMlflowCrReady(testData.mlflowInstanceResourceYamlPath);
    });

    cy.then(() => {
      cy.step('[Setup] Provision EvalHub instance');
      return ensureEvalHubCrReady(testData.evalHubCrName, testData.evalHubInstanceResourceYamlPath);
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
    });

    cy.then(() => {
      cy.step('[Setup] Select an available MLflow experiment name');
      return findAvailableBenchmarkSuiteExperimentSuffix(
        evaluationTenantProject,
        testData.mlflowExperimentName,
        scenarioUuid,
        [key],
      ).then((suffix) => {
        experimentName = `${testData.mlflowExperimentName}-${suffix}-${key}`;
        cy.log(`MLflow experiment: ${experimentName}`);
      });
    });

    cy.then(() => {
      // Establish the browser/BFF session before calling the EvalHub cleanup APIs. This works
      // with both the local E2E proxy and direct-cluster Cypress configurations.
      cy.step('[Setup] Open EvalHub and remove stale runs and collections');
      navigateToEvaluationsPage(evaluationTenantProject);
      clearEvalHubEvaluationJobs(evaluationTenantProject);
      deleteEvalHubTenantCollections(evaluationTenantProject);
    });
  };

  const cleanup = (): void => {
    cleanupEvalHubTestResources({
      evaluationTenantProject,
      mlflowExperimentName: experimentName,
      hardwareProfileName,
      collectionIds: createdCollectionIds,
      deleteAllTenantCollections: true,
    });
  };

  const run = (): void => {
    const evaluationRunName = `e2e-suite-${key}-${scenarioUuid}`;

    createBenchmarkSuite({
      suiteName: createdSuiteName,
      benchmarkProviderId: testData.benchmarkProviderId,
      benchmarks: testData.benchmarks,
      additionalBenchmarkParams: testData.additionalBenchmarkParams,
      runAfterSave,
    });

    if (runAfterSave) {
      submitCreatedBenchmarkSuiteEvaluation({
        suiteName: createdSuiteName,
        evaluationRunName,
        inferenceServiceName,
        mlflowExperimentName: experimentName,
      });
      trackCreatedCollectionId();
    } else {
      // The save-only flow has reached the exact collections route before this API lookup.
      trackCreatedCollectionId();
      navigateToEvaluationsPage(evaluationTenantProject);
      submitBenchmarkSuiteEvaluation({
        suiteName: createdSuiteName,
        evaluationRunName,
        inferenceServiceName,
        mlflowExperimentName: experimentName,
      });
    }

    verifyEvaluationProgressModal(evaluationRunName);
    waitForEvaluationJobComplete(evaluationTenantProject, 1800000);
    verifyEvaluationCompletedAndViewResults(
      evaluationRunName,
      evaluationTenantProject,
      testData.expectedBenchmarkIds,
    );
  };

  return { setup, cleanup, run };
};
