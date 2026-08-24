import * as yaml from 'js-yaml';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { addUserToProject, deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { cleanupHardwareProfiles } from '../../../utils/oc_commands/hardwareProfiles';
import type { EvalHubTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  createEvalHubCr,
  waitForEvaluationJobComplete,
} from '../../../utils/oc_commands/evalHubInstance';
import { deleteMlflowCr, ensureMlflowCrReady } from '../../../utils/oc_commands/mlflowInstance';
import {
  grantEvalHubTenantAccess,
  setupTenantAndDeployModel,
} from '../../../utils/oc_commands/evalHubModelDeploy';
import { evaluationsPage } from '../../../pages/evaluations';
import { evalHubEvaluationFlow } from '../../../pages/evalHubEvaluationFlow';

/**
 * Live-cluster Eval Hub E2E. Creates an ephemeral per-test namespace containing the EvalHub CR
 * (tenancy: single), a vLLM-served model, and all evaluation jobs. The namespace is deleted after
 * the test — no shared cluster resources are created or torn down.
 */
describe('Eval Hub E2E', () => {
  let testData: EvalHubTestData;
  const uuid = Cypress.env('EVAL_HUB_UUID') || generateTestUUID();
  Cypress.env('EVAL_HUB_UUID', uuid);
  let testNamespace = '';
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
      hardwareProfileName = testData.hardwareProfileName;
      evalHubInstanceYamlPath = testData.evalHubInstanceResourceYamlPath;
      mlflowInstanceYamlPath = testData.mlflowInstanceResourceYamlPath;
      benchmarkCardTitle = testData.benchmarkCardTitle;
      additionalBenchmarkParams = testData.additionalBenchmarkParams;
      projectNamePrefix = testData.projectNamePrefix;
      testNamespace = `${testData.projectNamePrefix}-${uuid}`;
    });

    cy.then(() => {
      cy.step('Ensure MLflow CR is Available (prerequisite for EvalHub)');
      return ensureMlflowCrReady(mlflowInstanceYamlPath).then((created) => {
        if (created) {
          Cypress.env('MLFLOW_CR_CREATED_BY_TEST', true);
        }
      });
    });

    cy.then(() => {
      const tracked: string[] = Cypress.env('EVAL_HUB_CREATED_PROJECTS') || [];
      tracked.push(testNamespace);
      Cypress.env('EVAL_HUB_CREATED_PROJECTS', tracked);
      cy.step(`Create ephemeral project ${testNamespace}`);
      createCleanProject(testNamespace);
    });

    cy.then(() => {
      cy.step('Create EvalHub CR (tenancy: single) in test namespace');
      return createEvalHubCr(testNamespace, evalHubInstanceYamlPath);
    });

    cy.then(() => {
      addUserToProject(testNamespace, LDAP_ADMIN_USER.USERNAME, 'admin');
      setupTenantAndDeployModel(testNamespace, testData, hardwareProfileName);
      grantEvalHubTenantAccess(testNamespace, LDAP_ADMIN_USER.USERNAME);
      inferenceServiceName = testData.inferenceServiceName;
      cy.log(`InferenceService: ${inferenceServiceName}`);
    });
  });

  after(() => {
    ensureAdminOcSession();

    const projectsToDelete = [
      ...new Set((Cypress.env('EVAL_HUB_CREATED_PROJECTS') || []) as string[]),
    ];
    projectsToDelete.forEach((project) => {
      cy.step(`Delete test namespace ${project}`);
      deleteOpenShiftProject(project, { wait: false, ignoreNotFound: true });
    });

    if (hardwareProfileName) {
      cy.step(`Clean up Hardware Profile: ${hardwareProfileName}`);
      cleanupHardwareProfiles(hardwareProfileName);
    }

    if (Cypress.env('MLFLOW_CR_CREATED_BY_TEST')) {
      cy.step('Delete MLflow CR created by this suite');
      deleteMlflowCr();
    }
  });

  it(
    'Eval Hub: start inference evaluation and see it complete',
    {
      retries: { runMode: 0, openMode: 0 },
      tags: ['@EvalHub', '@EvalHubCI', '@Featureflagged'],
    },
    () => {
      const extraParams = additionalBenchmarkParams.trim();
      const evaluationRunName = `e2e-eval-${testNamespace.replace(`${projectNamePrefix}-`, '')}`;

      cy.step('Log into the application and open Evaluations page');
      cy.visitWithLogin(evaluationsPage.pathWithLmEvalDevFlags(testNamespace), LDAP_ADMIN_USER);
      evaluationsPage.assertEvaluationsShellVisible(testNamespace);

      cy.step('Create new evaluation → single benchmark');
      evalHubEvaluationFlow.openCreateEvaluationFromList();
      evalHubEvaluationFlow.selectSingleBenchmarkEntry();

      cy.step(`Select benchmark: ${benchmarkCardTitle}`);
      evalHubEvaluationFlow.startRunForBenchmarkCardContaining(benchmarkCardTitle);

      cy.step('Fill evaluation form');
      evalHubEvaluationFlow.findBenchmarkNameDisplay().should('contain.text', benchmarkCardTitle);
      evalHubEvaluationFlow.findEvaluationNameInput().clear().type(evaluationRunName);

      cy.step('Select deployed cluster model from picker');
      evalHubEvaluationFlow.selectClusterModel(inferenceServiceName);

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

      cy.step('Wait for evaluation job to complete on backend');
      waitForEvaluationJobComplete(testNamespace);

      cy.step('Verify evaluation shows completed in UI');
      evaluationsPage.assertEvaluationCompleteInUI(evaluationRunName);
    },
  );
});
