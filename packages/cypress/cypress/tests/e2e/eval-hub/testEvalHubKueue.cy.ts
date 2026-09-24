import * as yaml from 'js-yaml';
import {
  clearEvalHubEvaluationJobs,
  createBenchmarkSuite,
  createEvalHubCleanupSteps,
  navigateToEvaluationsPage,
  runEvalHubCleanup,
  submitSingleBenchmarkEvaluation,
  submitCreatedBenchmarkSuiteEvaluation,
  verifyEvaluationCompletedAndViewResults,
  verifyEvaluationProgressModal,
  waitForEvaluationRunComplete,
} from '../../../utils/evalHubTestFlows';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { addUserToProject } from '../../../utils/oc_commands/project';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { EvalHubBenchmarkSuiteTestData, EvalHubTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  ensureEvalHubCrReady,
  isEvalHubKueueAvailable,
  waitForEvalHubKueueWorkload,
} from '../../../utils/oc_commands/evalHubInstance';
import {
  ensureMlflowCrReady,
  findAvailableExperimentSuffix,
} from '../../../utils/oc_commands/mlflow';
import {
  grantEvalHubTenantAccess,
  setupTenantAndDeployModel,
} from '../../../utils/oc_commands/evalHubModelDeploy';
import {
  cleanupEvalHubHardwareProfile,
  deleteEvalHubClusterQueue,
  deleteEvalHubResourceFlavor,
  getEvalHubHardwareProfileName,
  setupEvalHubKueueResources,
} from '../../../utils/oc_commands/evalHubHardwareProfile';
import { provisionEvalHubOfflineDataSecret } from '../../../utils/oc_commands/evalHubOfflineData';
import type { KueueWorkbenchConfig } from '../../../utils/oc_commands/kueueWorkbench';

type EvalHubKueueFixture = {
  projectNamePrefix: string;
  flavorNamePrefix: string;
  clusterQueueNamePrefix: string;
  localQueueNamePrefix: string;
  hardwareProfileNamePrefix: string;
  hardwareProfileResourceYamlPath: string;
  cpuQuota: number;
  memoryQuota: number;
};

/**
 * Runs only on clusters with Kueue installed. It keeps the four standard EvalHub E2Es in
 * ordinary tenants while proving a managed tenant requires and submits a Queue HardwareProfile.
 */
describe('Eval Hub E2E — Kueue hardware profile', () => {
  const uuid = Cypress.env('EVAL_HUB_KUEUE_UUID') || generateTestUUID();
  Cypress.env('EVAL_HUB_KUEUE_UUID', uuid);
  let testData: EvalHubTestData;
  let suiteTestData: EvalHubBenchmarkSuiteTestData;
  let kueueConfig: KueueWorkbenchConfig | undefined;
  let queueFixture: EvalHubKueueFixture;
  let evaluationTenantProject = '';
  let modelHardwareProfileName = '';
  let mlflowExperimentName = '';
  let mlflowSuiteExperimentName = '';
  let kueueAvailable = false;

  const requireKueueConfig = (): KueueWorkbenchConfig => {
    if (!kueueConfig) {
      throw new Error('Kueue E2E resources were not configured.');
    }
    return kueueConfig;
  };

  before(() => {
    ensureAdminOcSession();
    isEvalHubKueueAvailable().then((available) => {
      kueueAvailable = available;
      if (!available) {
        cy.log('Skipping EvalHub Kueue tests: Kueue CRDs or a running controller are unavailable.');
      }
    });
  });

  beforeEach(function skipWhenKueueUnavailable() {
    if (!kueueAvailable) {
      this.skip();
    }
  });

  retryableBefore(() => {
    ensureAdminOcSession();

    cy.fixture('e2e/eval-hub/testEvalHubSingleBenchmark.yaml', 'utf8').then(
      (yamlContent: string) => {
        testData = yaml.load(yamlContent) as EvalHubTestData;
        modelHardwareProfileName = getEvalHubHardwareProfileName(uuid);
      },
    );
    cy.fixture('e2e/eval-hub/testEvalHubKueue.yaml', 'utf8').then((yamlContent: string) => {
      queueFixture = yaml.load(yamlContent) as EvalHubKueueFixture;
      evaluationTenantProject = `${queueFixture.projectNamePrefix}-${uuid}`;
      kueueConfig = {
        flavorName: `${queueFixture.flavorNamePrefix}-${uuid}`,
        clusterQueueName: `${queueFixture.clusterQueueNamePrefix}-${uuid}`,
        localQueueName: `${queueFixture.localQueueNamePrefix}-${uuid}`,
        hardwareProfileName: `${queueFixture.hardwareProfileNamePrefix}-${uuid}`,
        hardwareProfileDisplayName: `${queueFixture.hardwareProfileNamePrefix}-${uuid}`,
        cpuQuota: queueFixture.cpuQuota,
        memoryQuota: queueFixture.memoryQuota,
      };
    });
    cy.fixture('e2e/eval-hub/testEvalHubBenchmarkSuite.yaml', 'utf8').then(
      (yamlContent: string) => {
        suiteTestData = yaml.load(yamlContent) as EvalHubBenchmarkSuiteTestData;
      },
    );

    cy.then(() => {
      cy.step('[Setup] Provision MLflow and EvalHub');
      return ensureMlflowCrReady(testData.mlflowInstanceResourceYamlPath).then(() =>
        ensureEvalHubCrReady(testData.evalHubCrName, testData.evalHubInstanceResourceYamlPath),
      );
    });

    cy.then(() => {
      cy.step(`[Setup] Create tenant project: ${evaluationTenantProject}`);
      createCleanProject(evaluationTenantProject);
    });

    cy.then(() => provisionEvalHubOfflineDataSecret(evaluationTenantProject));

    cy.then(() => {
      cy.step('[Setup] Deploy model before enabling Kueue on the tenant');
      addUserToProject(evaluationTenantProject, LDAP_ADMIN_USER.USERNAME, 'admin');
      setupTenantAndDeployModel(evaluationTenantProject, testData, modelHardwareProfileName);
      grantEvalHubTenantAccess(evaluationTenantProject, LDAP_ADMIN_USER.USERNAME);
    });

    cy.then(() => {
      cy.step('[Setup] Create the Kueue queue and evaluation HardwareProfile');
      return setupEvalHubKueueResources(
        requireKueueConfig(),
        evaluationTenantProject,
        queueFixture.hardwareProfileResourceYamlPath,
      );
    });

    cy.then(() =>
      findAvailableExperimentSuffix(
        evaluationTenantProject,
        [testData.mlflowExperimentName, `${testData.mlflowExperimentName}-suite`],
        uuid,
      ).then((suffix) => {
        mlflowExperimentName = `${testData.mlflowExperimentName}-${suffix}`;
        mlflowSuiteExperimentName = `${testData.mlflowExperimentName}-suite-${suffix}`;
      }),
    );

    cy.then(() => {
      navigateToEvaluationsPage(evaluationTenantProject);
      clearEvalHubEvaluationJobs(evaluationTenantProject);
    });
  });

  after(() => {
    if (!kueueAvailable) {
      return;
    }
    ensureAdminOcSession();
    const config = kueueConfig;
    runEvalHubCleanup([
      ...createEvalHubCleanupSteps({
        evaluationTenantProject,
        mlflowExperimentName,
        mlflowExperimentNames: mlflowSuiteExperimentName ? [mlflowSuiteExperimentName] : [],
        hardwareProfileName: modelHardwareProfileName,
        deleteAllTenantCollections: true,
      }),
      ...(config
        ? [
            {
              description: `Delete Queue HardwareProfile ${config.hardwareProfileName}`,
              run: () => cleanupEvalHubHardwareProfile(config.hardwareProfileName),
            },
            {
              description: `Delete ClusterQueue ${config.clusterQueueName}`,
              run: () => deleteEvalHubClusterQueue(config.clusterQueueName),
            },
            {
              description: `Delete ResourceFlavor ${config.flavorName}`,
              run: () => deleteEvalHubResourceFlavor(config.flavorName),
            },
          ]
        : []),
    ]);
  });

  it(
    'requires a Queue HardwareProfile and sends it when starting a single-benchmark evaluation',
    {
      retries: { runMode: 0, openMode: 0 },
      tags: ['@EvalHubKueue', '@Kueue'],
    },
    () => {
      const config = requireKueueConfig();
      const evaluationRunName = `e2e-kueue-${uuid}`;
      submitSingleBenchmarkEvaluation({
        benchmarkCardTitle: testData.benchmarkCardTitle,
        evaluationRunName,
        inferenceServiceName: testData.inferenceServiceName,
        mlflowExperimentName,
        hardwareProfileName: config.hardwareProfileName,
        additionalBenchmarkParams: testData.additionalBenchmarkParams,
      });

      cy.step(`Verify EvalHub created a Workload in ${config.localQueueName}`);
      waitForEvalHubKueueWorkload(evaluationTenantProject, config.localQueueName);
      verifyEvaluationProgressModal(evaluationRunName);
      cy.step(`Wait for Kueue evaluation ${evaluationRunName} to complete`);
      waitForEvaluationRunComplete(evaluationTenantProject, evaluationRunName);
      verifyEvaluationCompletedAndViewResults(evaluationRunName, evaluationTenantProject);
    },
  );

  it(
    'requires a Queue HardwareProfile in the benchmark-suite run modal',
    {
      retries: { runMode: 0, openMode: 0 },
      tags: ['@EvalHubKueue', '@Kueue'],
    },
    () => {
      const config = requireKueueConfig();
      const suiteName = `${suiteTestData.suiteName} Kueue ${uuid}`;
      const evaluationRunName = `e2e-kueue-suite-${uuid}`;
      const { benchmarks } = suiteTestData;

      navigateToEvaluationsPage(evaluationTenantProject);
      createBenchmarkSuite({
        suiteName,
        benchmarkProviderId: suiteTestData.benchmarkProviderId,
        benchmarks,
        additionalBenchmarkParams: suiteTestData.additionalBenchmarkParams,
        runAfterSave: true,
      });
      submitCreatedBenchmarkSuiteEvaluation({
        suiteName,
        evaluationRunName,
        inferenceServiceName: testData.inferenceServiceName,
        mlflowExperimentName: mlflowSuiteExperimentName,
        hardwareProfileName: config.hardwareProfileName,
      });
      verifyEvaluationProgressModal(evaluationRunName);
      cy.step(`Wait for Kueue benchmark suite ${evaluationRunName} to complete`);
      waitForEvaluationRunComplete(evaluationTenantProject, evaluationRunName, 1800000);
      verifyEvaluationCompletedAndViewResults(
        evaluationRunName,
        evaluationTenantProject,
        benchmarks.map(({ id }) => id),
      );
    },
  );
});
