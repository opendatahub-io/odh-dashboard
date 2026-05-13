import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { pollUntilSuccess } from '../../../utils/oc_commands/baseCommands';
import { getCustomResource } from '../../../utils/oc_commands/customResources';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { isTrustyAIStackAvailable } from '../../../utils/oc_commands/dsc';
import { checkInferenceServiceState } from '../../../utils/oc_commands/modelServing';
import {
  createCleanHardwareProfile,
  cleanupHardwareProfiles,
} from '../../../utils/oc_commands/hardwareProfiles';
import type { EvalHubTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  deleteEvalHubCr,
  deleteEvalHubE2eDatabaseSecret,
  ensureEvalHubCrReady,
} from '../../../utils/oc_commands/evalHubInstance';
import { deleteMlflowCr, ensureMlflowCrReady } from '../../../utils/oc_commands/mlflowInstance';
import { evaluationsPage } from '../../../pages/evaluations';
import { evalHubEvaluationFlow } from '../../../pages/evalHubEvaluationFlow';

/**
 * Live-cluster Eval Hub E2E. Ensures EvalHub + MLflow CRs are Ready, creates an ephemeral
 * OpenShift project with a vLLM-served model, then drives the Evaluations UI to submit an
 * inference evaluation and verify it completes.
 */
describe('Eval Hub E2E', () => {
  let testData: EvalHubTestData;
  let skipTest = false;
  let evaluationTenantProject = '';
  let evalHubCrCreatedByTest = false;
  let evalHubCrName = 'evalhub';
  let mlflowCrCreatedByTest = false;
  let hardwareProfileName = '';
  let vllmEndpointUrl = '';

  retryableBefore(() => {
    Cypress.on('uncaught:exception', (err) => {
      if (err.message.includes('expected expression') || err.message.includes('Unexpected token')) {
        return false;
      }
      return true;
    });

    cy.step('Confirm RHOAI operator');
    getCustomResource('redhat-ods-operator', 'Deployment', 'name=rhods-operator').then((result) => {
      if (!result.stdout.includes('rhods-operator')) {
        cy.log('RHOAI operator not found; skipping Eval Hub E2E.');
        skipTest = true;
      }
    });

    cy.step('Confirm TrustyAI on DataScienceCluster');
    cy.then(() => {
      if (skipTest) {
        return;
      }
      return isTrustyAIStackAvailable().then((ok) => {
        if (!ok) {
          cy.log('TrustyAI not available on DataScienceCluster; skipping Eval Hub E2E.');
          skipTest = true;
        }
      });
    });

    cy.then(() => {
      if (skipTest) {
        return;
      }

      return cy.fixture('e2e/eval-hub/testEvalHub.yaml', 'utf8').then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as EvalHubTestData;
        evalHubCrName = testData.evalHubCrName ?? 'evalhub';
        hardwareProfileName = testData.hardwareProfileName ?? '';
        const evalHubInstanceYamlPath =
          testData.evalHubInstanceResourceYamlPath ?? 'resources/eval-hub/evalhub-instance.yaml';
        const mlflowYamlPath =
          testData.mlflowInstanceResourceYamlPath ??
          'resources/mlflow/mlflow-instance-rhoai-ea2-minimal.yaml';

        cy.step('Ensure EvalHub CR is Ready');
        return ensureEvalHubCrReady(evalHubCrName, evalHubInstanceYamlPath)
          .then((created) => {
            evalHubCrCreatedByTest = created;

            cy.step('Ensure MLflow CR is Available');
            return ensureMlflowCrReady(mlflowYamlPath);
          })
          .then((created) => {
            mlflowCrCreatedByTest = created;

            // Reuse an existing eval-hub-e2e project if one exists (spec re-evaluation guard)
            return cy
              .exec(
                `oc get projects -o name | grep eval-hub-e2e | head -1 | sed 's|project.project.openshift.io/||'`,
                { failOnNonZeroExit: false },
              )
              .then((result) => {
                const existingProject = result.stdout.trim();
                if (existingProject) {
                  cy.log(`Reusing existing tenant project: ${existingProject}`);
                  evaluationTenantProject = existingProject;
                  const isvcName = testData.inferenceServiceName ?? 'evalhub-llm';
                  vllmEndpointUrl = `http://${isvcName}-predictor.${existingProject}.svc.cluster.local:8080`;
                  return;
                }

                const uuid = generateTestUUID();
                evaluationTenantProject = `eval-hub-e2e-${uuid}`;
                cy.step(`Create ephemeral project ${evaluationTenantProject}`);
                createCleanProject(evaluationTenantProject);

                return pollUntilSuccess(
                  `oc get project "${evaluationTenantProject}" -o name`,
                  `OpenShift project ${evaluationTenantProject}`,
                  { maxAttempts: 90, pollIntervalMs: 2000 },
                ).then(() => {
                  const ns = evaluationTenantProject;

                  cy.step('Label namespace so TrustyAI operator provisions tenant RBAC');
                  cy.exec(
                    `oc label namespace ${ns} opendatahub.io/generated-namespace=true evalhub.trustyai.opendatahub.io/tenant= --overwrite`,
                  );

                  cy.step('Wait for operator to reconcile tenant resources');
                  pollUntilSuccess(
                    `oc -n ${ns} get sa evalhub-redhat-ods-applications-job -o name`,
                    'operator-provisioned ServiceAccount',
                    { maxAttempts: 30, pollIntervalMs: 2000 },
                  );
                  pollUntilSuccess(
                    `oc -n ${ns} get configmap evalhub-service-ca -o name`,
                    'operator-provisioned evalhub-service-ca ConfigMap',
                    { maxAttempts: 30, pollIntervalMs: 2000 },
                  );
                  pollUntilSuccess(
                    `oc -n ${ns} get role evalhub-redhat-ods-applications-job-access-role -o name`,
                    'operator-provisioned status-events Role',
                    { maxAttempts: 30, pollIntervalMs: 2000 },
                  );

                  cy.step('Deploy vLLM model in tenant namespace');
                  const isvcName = testData.inferenceServiceName ?? 'evalhub-llm';
                  const modelUri =
                    testData.modelOciUri ??
                    'oci://quay.io/redhat-ai-services/modelcar-catalog:llama-3.2-1b-instruct';
                  const servingRuntimePath =
                    testData.servingRuntimeYamlPath ??
                    'resources/modelServing/singleModel/vllm_cpu_amd64_runtime.yaml';
                  const hwProfilePath =
                    testData.hardwareProfileResourceYamlPath ??
                    'resources/hardwareProfile/gen_ai_hardware_profile.yaml';

                  createCleanHardwareProfile(hwProfilePath);

                  cy.fixture(servingRuntimePath, 'utf8').then((srYaml: string) => {
                    const tmpFile = `/tmp/evalhub-sr-${ns}.yaml`;
                    cy.exec(`cat <<'EOFSR' > ${tmpFile}\n${srYaml}\nEOFSR`);
                    cy.exec(`oc apply -n ${ns} -f ${tmpFile}`, { failOnNonZeroExit: false });
                  });

                  const isvcYaml = `
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: ${isvcName}
  annotations:
    serving.kserve.io/deploymentMode: RawDeployment
    opendatahub.io/hardware-profile: ${hardwareProfileName || 'cypress-gen-ai-hardware-profile'}
  labels:
    opendatahub.io/dashboard: 'true'
spec:
  predictor:
    model:
      modelFormat:
        name: vLLM
      runtime: vllm-cpu-runtime-amd64
      storageUri: ${modelUri}
`;
                  const isvcTmpFile = `/tmp/evalhub-isvc-${ns}.yaml`;
                  cy.exec(`cat <<'EOFISVC' > ${isvcTmpFile}\n${isvcYaml}\nEOFISVC`);
                  cy.exec(`oc apply -n ${ns} -f ${isvcTmpFile}`, { failOnNonZeroExit: false });

                  cy.step('Wait for InferenceService to be Ready');
                  checkInferenceServiceState(isvcName, ns, { checkReady: true });

                  vllmEndpointUrl = `http://${isvcName}-predictor.${ns}.svc.cluster.local:8080`;
                  cy.log(`vLLM endpoint: ${vllmEndpointUrl}`);
                });
              });
          });
      });
    });
  });

  after(() => {
    if (evaluationTenantProject) {
      cy.log(`Deleting ephemeral tenant project ${evaluationTenantProject}`);
      deleteOpenShiftProject(evaluationTenantProject, { wait: false, ignoreNotFound: true });
    }

    if (hardwareProfileName) {
      cy.log(`Cleaning up Hardware Profile: ${hardwareProfileName}`);
      cleanupHardwareProfiles(hardwareProfileName);
    }

    cy.then(() => {
      if (skipTest || !evalHubCrCreatedByTest) {
        return cy.wrap(null);
      }
      cy.log(`Deleting EvalHub CR ${evalHubCrName} created by this suite`);
      return deleteEvalHubCr(evalHubCrName);
    })
      .then(() => {
        if (skipTest || !evalHubCrCreatedByTest) {
          return cy.wrap(null);
        }
        return deleteEvalHubE2eDatabaseSecret();
      })
      .then(() => {
        if (skipTest || !mlflowCrCreatedByTest) {
          return cy.wrap(null);
        }
        cy.log('Deleting MLflow CR created by this suite');
        return deleteMlflowCr();
      });
  });

  it(
    'Eval Hub: start inference evaluation and see it complete',
    {
      tags: ['@Sanity', '@SanitySet1', '@EvalHub', '@NonConcurrent'],
    },
    function evalHubInferenceE2E() {
      if (skipTest) {
        this.skip();
      }

      const ns = evaluationTenantProject;
      const benchmarkTitle = testData.benchmarkCardTitle ?? 'Basic science Q&A';
      const endpointUrl = vllmEndpointUrl;
      const modelName = testData.inferenceModelName ?? 'evalhub-llm';
      const extraParams = (testData.additionalBenchmarkParams ?? '').trim();
      const evaluationRunName = `e2e-eval-${ns.replace('eval-hub-e2e-', '')}`;

      cy.step('Open Evaluations page');
      cy.visitWithLogin(evaluationsPage.pathWithLmEvalDevFlags(ns), HTPASSWD_CLUSTER_ADMIN_USER);
      evaluationsPage.assertEvaluationsShellVisible(ns);

      cy.step('Create new evaluation → single benchmark');
      evalHubEvaluationFlow.openCreateEvaluationFromList();
      evalHubEvaluationFlow.selectSingleBenchmarkEntry();

      cy.step(`Select benchmark: ${benchmarkTitle}`);
      evalHubEvaluationFlow.startRunForBenchmarkCardContaining(benchmarkTitle);

      cy.step('Fill evaluation form');
      cy.findByTestId('benchmark-name-display').should('contain.text', benchmarkTitle);
      evalHubEvaluationFlow.findEvaluationNameInput().clear().type(evaluationRunName);
      cy.findByTestId('experiment-mode-new').should('be.checked');
      cy.findByTestId('new-experiment-name-input').should('have.value', 'EvalHub');
      evalHubEvaluationFlow.findInputModeInference().should('be.checked');

      cy.step('Enter model details');
      evalHubEvaluationFlow.findModelNameInput().clear().type(modelName);
      evalHubEvaluationFlow.findEndpointUrlInput().clear().type(endpointUrl);

      if (extraParams) {
        cy.step('Add benchmark parameters');
        evalHubEvaluationFlow.findBenchmarkParametersCheckbox().check({ force: true });
        evalHubEvaluationFlow
          .findAdditionalBenchmarkParamsTextarea()
          .should('be.visible')
          .clear()
          .type(extraParams, { parseSpecialCharSequences: false });
      }

      cy.step('Submit and verify evaluation appears in table');
      evalHubEvaluationFlow.findStartEvaluationSubmitButton().should('be.enabled');
      evalHubEvaluationFlow.findStartEvaluationSubmitButton().click();
      cy.url({ timeout: 120000 }).should('not.include', '/create');

      evaluationsPage.assertEvaluationsTableContains(evaluationRunName);

      cy.step('Wait for evaluation to complete');
      evaluationsPage.assertEvaluationComplete(evaluationRunName);
    },
  );
});
