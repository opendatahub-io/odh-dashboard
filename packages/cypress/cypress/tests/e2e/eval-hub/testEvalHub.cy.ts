import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { pollUntilSuccess } from '../../../utils/oc_commands/baseCommands';
import { getCustomResource } from '../../../utils/oc_commands/customResources';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { isTrustyAIStackAvailable } from '../../../utils/oc_commands/dsc';
import type { EvalHubTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import { deleteEvalHubCr, ensureEvalHubCrReady } from '../../../utils/oc_commands/evalHubInstance';
import { ensureEvalHubTenantRoleBindingsForEvalHubService } from '../../../utils/oc_commands/evalHubTenantRbac';
import { deleteMlflowCr, ensureMlflowCrReady } from '../../../utils/oc_commands/mlflowInstance';
import { evaluationsPage } from '../../../pages/evaluations';
import { evalHubEvaluationFlow } from '../../../pages/evalHubEvaluationFlow';

/**
 * Live-cluster Eval Hub E2E (no model serving deploy). Creates an ephemeral OpenShift project per run
 * for `/evaluation/:ns` and TrustyAI tenant RoleBindings; ensures EvalHub CR + cluster MLflow CR when missing.
 */
describe('Eval Hub E2E', () => {
  let testData: EvalHubTestData;
  let skipTest = false;
  const uuid = generateTestUUID();
  /** Ephemeral project for Evaluations UI + tenant RBAC (created in `retryableBefore`; deleted in `after`). */
  let evaluationTenantProject = '';
  /** True when this suite applied the EvalHub CR (teardown deletes it). */
  let evalHubCrCreatedByTest = false;
  let evalHubCrName = 'evalhub';
  /** True when this suite applied the cluster `mlflow` MLflow CR (teardown deletes it). */
  let mlflowCrCreatedByTest = false;

  retryableBefore(() => {
    Cypress.on('uncaught:exception', (err) => {
      if (err.message.includes('expected expression') || err.message.includes('Unexpected token')) {
        return false;
      }
      return true;
    });

    cy.step('Confirm RHOAI operator (Eval Hub E2E expects RHOAI)');
    getCustomResource('redhat-ods-operator', 'Deployment', 'name=rhods-operator').then((result) => {
      if (!result.stdout.includes('rhods-operator')) {
        cy.log('RHOAI operator not found; skipping Eval Hub E2E.');
        skipTest = true;
      } else {
        cy.log('RHOAI operator confirmed:', result.stdout);
      }
    });

    cy.step(
      'Confirm TrustyAI on DataScienceCluster (Managed or Unmanaged; test does not modify DSC)',
    );
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
        const evalHubInstanceYamlPath =
          testData.evalHubInstanceResourceYamlPath ?? 'resources/eval-hub/evalhub-instance.yaml';

        evaluationTenantProject = `eval-hub-e2e-${uuid}`;
        cy.step(`Create ephemeral Eval Hub tenant project ${evaluationTenantProject}`);
        createCleanProject(evaluationTenantProject);

        return pollUntilSuccess(
          `oc get project "${evaluationTenantProject}" -o name`,
          `OpenShift project ${evaluationTenantProject}`,
          { maxAttempts: 90, pollIntervalMs: 2000 },
        )
          .then(() => {
            cy.step(
              'Ensure EvalHub CR exists and is Ready (APPLICATIONS_NAMESPACE; fresh cluster)',
            );
            return ensureEvalHubCrReady(evalHubCrName, evalHubInstanceYamlPath).then((created) => {
              evalHubCrCreatedByTest = created;
            });
          })
          .then(() => {
            cy.step(
              `Ensure cluster MLflow CR and TrustyAI tenant RoleBindings in ${evaluationTenantProject} (apply if missing)`,
            );

            const mlflowYamlPath =
              testData.mlflowInstanceResourceYamlPath ??
              'resources/mlflow/mlflow-instance-rhoai-ea2-minimal.yaml';

            return ensureMlflowCrReady(mlflowYamlPath).then((created) => {
              mlflowCrCreatedByTest = created;
              return ensureEvalHubTenantRoleBindingsForEvalHubService(evaluationTenantProject);
            });
          });
      });
    });
  });

  after(() => {
    cy.then(() => {
      if (skipTest || !evalHubCrCreatedByTest) {
        return cy.wrap(null);
      }
      cy.log(`Deleting EvalHub CR ${evalHubCrName} created by this suite`);
      return deleteEvalHubCr(evalHubCrName);
    })
      .then(() => {
        if (skipTest || !mlflowCrCreatedByTest) {
          return cy.wrap(null);
        }
        cy.log('Deleting MLflow CR created by this suite');
        return deleteMlflowCr();
      })
      .then(() => {
        if (skipTest || !evaluationTenantProject) {
          return;
        }
        cy.log(`Deleting ephemeral tenant project ${evaluationTenantProject}`);
        deleteOpenShiftProject(evaluationTenantProject, { wait: false, ignoreNotFound: true });
      });
  });

  it(
    'Eval Hub: Evaluations page shows Start evaluation run',
    {
      tags: ['@Sanity', '@SanitySet1', '@EvalHub', '@NonConcurrent'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping — Eval Hub E2E prerequisites not met on this cluster.');
        return;
      }

      const ns = evaluationTenantProject;

      cy.step(`Sign in to /evaluation/${ns} (ephemeral project from suite); LM eval dev flags`);
      cy.visitWithLogin(evaluationsPage.pathWithLmEvalDevFlags(ns), HTPASSWD_CLUSTER_ADMIN_USER);
      evaluationsPage.assertEvaluationsShellVisible(ns);
    },
  );

  it(
    'Eval Hub: start Gemini inference evaluation and see it in the table',
    {
      tags: ['@Sanity', '@SanitySet1', '@EvalHub', '@NonConcurrent'],
    },
    function evalHubGeminiInferenceE2E() {
      // Never call cy.* before this.skip(): cy.log enqueues cy.task (e2e support) and breaks Mocha skip.
      if (skipTest) {
        this.skip();
      }

      const geminiKey = Cypress.env('EVAL_HUB_GEMINI_API_KEY') as string | undefined;
      if (!geminiKey?.trim()) {
        // eslint-disable-next-line no-console -- sync notice; avoid cy.log before this.skip()
        console.log(
          'Skipping Gemini Eval Hub E2E: set EVAL_HUB_GEMINI_API_KEY in test-variables.yml (or process env).',
        );
        this.skip();
      }

      const ns = evaluationTenantProject;
      const benchmarkTitle = testData.benchmarkCardTitle ?? 'Basic science Q&A';
      const endpointUrl =
        testData.inferenceEndpointUrl ?? 'https://generativelanguage.googleapis.com/v1beta/openai';
      const modelName = testData.inferenceModelName ?? 'gemini-2.5-flash';
      const extraParams = (testData.additionalBenchmarkParams ?? '').trim();
      const evaluationRunName = `e2e-gemini-${uuid}`;

      cy.step('Open Evaluations with LM eval dev flags');
      cy.visitWithLogin(evaluationsPage.pathWithLmEvalDevFlags(ns), HTPASSWD_CLUSTER_ADMIN_USER);
      evaluationsPage.assertEvaluationsShellVisible(ns);

      cy.step('Create new evaluation → single benchmark');
      evalHubEvaluationFlow.openCreateEvaluationFromList();
      evalHubEvaluationFlow.selectSingleBenchmarkEntry();

      cy.step(`Select benchmark card: ${benchmarkTitle}`);
      evalHubEvaluationFlow.startRunForBenchmarkCardContaining(benchmarkTitle);

      cy.step(
        'Start evaluation form: name, defaults (MLflow new experiment EvalHub), inference source',
      );
      cy.findByTestId('benchmark-name-display').should('contain.text', benchmarkTitle);
      evalHubEvaluationFlow.findEvaluationNameInput().clear().type(evaluationRunName);
      cy.findByTestId('experiment-mode-new').should('be.checked');
      cy.findByTestId('new-experiment-name-input').should('have.value', 'EvalHub');
      evalHubEvaluationFlow.findInputModeInference().should('be.checked');

      cy.step('Model details (OpenAI-compatible Gemini endpoint)');
      evalHubEvaluationFlow.findModelNameInput().clear().type(modelName);
      evalHubEvaluationFlow.findEndpointUrlInput().clear().type(endpointUrl);
      evalHubEvaluationFlow.findApiKeyInput().clear().type(geminiKey, { log: false });

      if (extraParams) {
        cy.step('Benchmark parameters JSON');
        evalHubEvaluationFlow.findBenchmarkParametersCheckbox().check({ force: true });
        evalHubEvaluationFlow
          .findAdditionalBenchmarkParamsTextarea()
          .should('be.visible')
          .clear()
          .type(extraParams, { parseSpecialCharSequences: false });
      }

      cy.step('Submit and return to evaluations list');
      evalHubEvaluationFlow.findStartEvaluationSubmitButton().should('be.enabled');
      evalHubEvaluationFlow.findStartEvaluationSubmitButton().click();
      cy.url({ timeout: 120000 }).should('include', `/evaluation/${ns}`);
      cy.url().should('not.include', '/create');

      cy.step('Evaluation name appears in the table');
      evaluationsPage.assertEvaluationsTableContains(evaluationRunName);
    },
  );
});
