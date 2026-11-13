import * as yaml from 'js-yaml';
import { LDAP_ADMIN_USER } from './e2eUsers';
import {
  clearEvalHubEvaluationJobs,
  cleanupEvalHubTestResources,
  createBenchmarkSuite,
  deleteEvalHubTenantCollections,
  findAvailableBenchmarkSuiteExperimentSuffix,
  findEvalHubCollectionIdByName,
  getEvalHubExperimentSuffix,
  navigateToEvaluationsPage,
  submitCuratedCollectionEvaluation,
  submitBenchmarkSuiteEvaluation,
  submitCreatedBenchmarkSuiteEvaluation,
  verifyEvaluationCompletedAndViewResults,
  verifyEvaluationProgressModal,
} from './evalHubTestFlows';
import { createCleanProject } from './projectChecker';
import { generateTestUUID } from './uuidGenerator';
import { ensureAdminOcSession } from './oc_commands/baseCommands';
import {
  ensureEvalHubCrReady,
  type EvalHubInstance,
  waitForEvaluationJobComplete,
} from './oc_commands/evalHubInstance';
import { getEvalHubHardwareProfileName } from './oc_commands/evalHubHardwareProfile';
import { provisionEvalHubOfflineDataSecret } from './oc_commands/evalHubOfflineData';
import {
  grantEvalHubTenantAccess,
  setupTenantAndDeployModel,
} from './oc_commands/evalHubModelDeploy';
import { ensureMlflowCrReady } from './oc_commands/mlflow';
import { addUserToProject } from './oc_commands/project';
import type { EvalHubBenchmarkSuiteTestData } from '../types';

export type BenchmarkSuiteScenarioKey =
  | 'save-and-run'
  | 'gallery'
  | 'curated-customize'
  | 'curated-run'
  | 'duplicate'
  | 'edit';

export type EvalHubBenchmarkSuiteScenario = {
  setup: () => void;
  cleanup: () => void;
  run: () => void;
  createSavedCollection: () => void;
  runSavedCollection: (suiteName: string, evaluationRunName: string) => void;
  runCuratedCollection: () => void;
  getTenantProject: () => string;
  getCreatedSuiteName: () => string;
  getTestData: () => EvalHubBenchmarkSuiteTestData;
};

const getScenarioFixturePath = (key: BenchmarkSuiteScenarioKey): string => {
  switch (key) {
    case 'curated-customize':
      return 'e2e/eval-hub/testEvalHubCuratedCollectionCustomize.yaml';
    case 'curated-run':
      return 'e2e/eval-hub/testEvalHubCuratedCollectionRun.yaml';
    case 'duplicate':
      return 'e2e/eval-hub/testEvalHubBenchmarkSuiteDuplicate.yaml';
    case 'edit':
      return 'e2e/eval-hub/testEvalHubBenchmarkSuiteEdit.yaml';
    case 'save-and-run':
    case 'gallery':
      return 'e2e/eval-hub/testEvalHubBenchmarkSuite.yaml';
  }
};

const getScenarioUuid = (key: BenchmarkSuiteScenarioKey): string => {
  const envKeys: Record<BenchmarkSuiteScenarioKey, string> = {
    'save-and-run': 'EVAL_HUB_SUITE_SAVE_AND_RUN_UUID',
    gallery: 'EVAL_HUB_SUITE_GALLERY_UUID',
    'curated-customize': 'EVAL_HUB_CURATED_CUSTOMIZE_UUID',
    'curated-run': 'EVAL_HUB_CURATED_RUN_UUID',
    duplicate: 'EVAL_HUB_SUITE_DUPLICATE_UUID',
    edit: 'EVAL_HUB_SUITE_EDIT_UUID',
  };
  const envKey = envKeys[key];
  const uuid = Cypress.env(envKey) || generateTestUUID();
  Cypress.env(envKey, uuid);
  return uuid;
};

/**
 * Creates the independently provisioned lifecycle shared by each benchmark-collection spec.
 * Separate tenants keep failures and cleanup in one journey from affecting the other.
 */
export const createEvalHubBenchmarkSuiteScenario = (
  key: BenchmarkSuiteScenarioKey,
): EvalHubBenchmarkSuiteScenario => {
  let testData: EvalHubBenchmarkSuiteTestData;
  const scenarioUuid = getScenarioUuid(key);
  const runAfterSave = key === 'save-and-run';
  const fixturePath = getScenarioFixturePath(key);
  let evaluationTenantProject = '';
  let hardwareProfileName = '';
  let inferenceServiceName = '';
  let createdSuiteName = '';
  let experimentName = '';
  let evalHubInstance: EvalHubInstance | undefined;
  const createdCollectionIds: string[] = [];

  const trackCreatedCollectionId = (): void => {
    findEvalHubCollectionIdByName(evaluationTenantProject, createdSuiteName).then((id) => {
      if (!createdCollectionIds.includes(id)) {
        createdCollectionIds.push(id);
      }
    });
  };

  /** Validates result cards against the benchmarks actually submitted for this run. */
  const verifySubmittedCollectionResults = (evaluationRunName: string): void => {
    cy.get('@createEvalHubJob').then((interception) => {
      const requestBody = (
        interception as {
          request: {
            body: { collection?: { benchmarks?: { id?: unknown }[] } };
          };
        }
      ).request.body;
      const benchmarks = requestBody.collection?.benchmarks;
      expect(benchmarks, `benchmarks submitted for ${evaluationRunName}`)
        .to.be.an('array')
        .and.to.have.length.greaterThan(0);
      const expectedBenchmarkIds = (benchmarks ?? []).map(({ id }, index) => {
        expect(id, `submitted benchmark ${index + 1} ID`).to.be.a('string');
        expect(id, `submitted benchmark ${index + 1} ID`).not.to.equal('');
        return String(id);
      });
      verifyEvaluationCompletedAndViewResults(evaluationRunName, expectedBenchmarkIds);
    });
  };

  const setup = (): void => {
    ensureAdminOcSession();
    cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as EvalHubBenchmarkSuiteTestData;
      hardwareProfileName = getEvalHubHardwareProfileName(scenarioUuid);
      evaluationTenantProject = `${testData.projectNamePrefix}-${scenarioUuid}`;
      createdSuiteName = `${testData.suiteName}-${scenarioUuid}`;
      inferenceServiceName = testData.inferenceServiceName;
    });

    cy.then(() => {
      cy.step('[Setup] Provision MLflow instance');
      return ensureMlflowCrReady(testData.mlflowInstanceResourceYamlPath);
    });

    cy.then(() => {
      cy.step('[Setup] Resolve EvalHub instance');
      return ensureEvalHubCrReady(
        testData.evalHubCrName,
        testData.evalHubInstanceResourceYamlPath,
      ).then((instance) => {
        evalHubInstance = instance;
      });
    });

    cy.then(() => {
      cy.step(`[Setup] Create tenant project: ${evaluationTenantProject}`);
      createCleanProject(evaluationTenantProject);
    });

    cy.then(() => provisionEvalHubOfflineDataSecret(evaluationTenantProject));

    cy.then(() => {
      cy.step('[Setup] Deploy vLLM model and configure tenant access');
      if (!evalHubInstance) {
        throw new Error('EvalHub instance was not resolved during setup.');
      }
      addUserToProject(evaluationTenantProject, LDAP_ADMIN_USER.USERNAME, 'admin');
      setupTenantAndDeployModel(
        evaluationTenantProject,
        testData,
        hardwareProfileName,
        evalHubInstance,
      );
      grantEvalHubTenantAccess(evaluationTenantProject, LDAP_ADMIN_USER.USERNAME);
    });

    cy.then(() => {
      cy.step('[Setup] Select an available MLflow experiment name');
      return getEvalHubExperimentSuffix(scenarioUuid).then((experimentSuffix) =>
        findAvailableBenchmarkSuiteExperimentSuffix(
          evaluationTenantProject,
          testData.mlflowExperimentName,
          experimentSuffix,
          [key],
        ).then((suffix) => {
          experimentName = `${testData.mlflowExperimentName}-${suffix}-${key}`;
          cy.log(`MLflow experiment: ${experimentName}`);
        }),
      );
    });

    cy.then(() => {
      // Establish the browser/BFF session before calling the EvalHub cleanup APIs. This works
      // with both the local E2E proxy and direct-cluster Cypress configurations.
      cy.step('[Setup] Open EvalHub and remove stale runs and collections');
      navigateToEvaluationsPage(
        evaluationTenantProject,
        key === 'curated-customize' || key === 'curated-run' ? 'gallery' : 'evaluate',
      );
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
      suiteDomains: testData.suiteDomains,
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
    verifyEvaluationCompletedAndViewResults(evaluationRunName, testData.expectedBenchmarkIds);
  };

  const createSavedCollection = (): void => {
    cy.step('[Setup] Create a saved collection for this scenario');
    createBenchmarkSuite({
      suiteName: createdSuiteName,
      suiteDomains: testData.suiteDomains,
      benchmarkProviderId: testData.benchmarkProviderId,
      benchmarks: testData.benchmarks,
      additionalBenchmarkParams: testData.additionalBenchmarkParams,
    });
    trackCreatedCollectionId();
  };

  const runSavedCollection = (suiteName: string, evaluationRunName: string): void => {
    submitBenchmarkSuiteEvaluation({
      suiteName,
      evaluationRunName,
      inferenceServiceName,
      mlflowExperimentName: experimentName,
    });
    verifyEvaluationProgressModal(evaluationRunName);
    waitForEvaluationJobComplete(evaluationTenantProject, 1800000);
    verifySubmittedCollectionResults(evaluationRunName);
  };

  const runCuratedCollection = (): void => {
    const collectionId = testData.curatedCollectionId;
    if (!collectionId) {
      throw new Error('The curated-run scenario fixture must provide a curated collection ID.');
    }
    const numExamples = testData.curatedRunNumExamples;
    if (!Number.isInteger(numExamples) || numExamples === undefined || numExamples < 1) {
      throw new Error(
        'The curated-run scenario fixture must provide a positive num_examples value.',
      );
    }
    const { tokenizer } = JSON.parse(testData.additionalBenchmarkParams) as Record<string, unknown>;
    if (typeof tokenizer !== 'string' || !tokenizer.trim()) {
      throw new Error(
        'The curated-run scenario fixture must provide an accessible tokenizer in additionalBenchmarkParams.',
      );
    }

    const evaluationRunName = `e2e-curated-run-${evaluationTenantProject}`;
    submitCuratedCollectionEvaluation({
      collectionId,
      benchmarkParameterOverrides: {
        // eslint-disable-next-line camelcase
        num_examples: numExamples,
        tokenizer: tokenizer.trim(),
      },
      evaluationRunName,
      inferenceServiceName,
      mlflowExperimentName: experimentName,
    });
    verifyEvaluationProgressModal(evaluationRunName);
    waitForEvaluationJobComplete(evaluationTenantProject, 1800000);
    verifySubmittedCollectionResults(evaluationRunName);
  };

  return {
    setup,
    cleanup,
    run,
    createSavedCollection,
    runSavedCollection,
    runCuratedCollection,
    getTenantProject: () => evaluationTenantProject,
    getCreatedSuiteName: () => createdSuiteName,
    getTestData: () => testData,
  };
};
