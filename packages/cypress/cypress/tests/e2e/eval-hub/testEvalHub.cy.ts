import * as yaml from 'js-yaml';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  addUserToProject,
  deleteOpenShiftProject,
  findExistingProjectByPrefix,
  waitForProjectReady,
} from '../../../utils/oc_commands/project';
import { getCustomResource } from '../../../utils/oc_commands/customResources';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { isTrustyAIStackAvailable } from '../../../utils/oc_commands/dsc';
import { cleanupHardwareProfiles } from '../../../utils/oc_commands/hardwareProfiles';
import type { EvalHubTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  deleteEvalHubCr,
  deleteEvalHubE2eDatabaseSecret,
  ensureEvalHubCrReady,
} from '../../../utils/oc_commands/evalHubInstance';
import { deleteMlflowCr, ensureMlflowCrReady } from '../../../utils/oc_commands/mlflowInstance';
import {
  getVllmEndpointUrl,
  grantEvalHubTenantAccess,
  setupTenantAndDeployModel,
} from '../../../utils/oc_commands/evalHubModelDeploy';
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
  const uuid = generateTestUUID();
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
      if (skipTest) return;
      return cy.fixture('e2e/eval-hub/testEvalHub.yaml', 'utf8').then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as EvalHubTestData;
        evalHubCrName = testData.evalHubCrName;
        hardwareProfileName = testData.hardwareProfileName;
      });
    });

    cy.then(() => {
      if (skipTest) return;
      const yamlPath = testData.evalHubInstanceResourceYamlPath;

      cy.step('Ensure EvalHub CR is Ready');
      return ensureEvalHubCrReady(evalHubCrName, yamlPath).then((created) => {
        evalHubCrCreatedByTest = created;
      });
    });

    cy.then(() => {
      if (skipTest) return;
      const yamlPath = testData.mlflowInstanceResourceYamlPath;

      cy.step('Ensure MLflow CR is Available');
      return ensureMlflowCrReady(yamlPath).then((created) => {
        mlflowCrCreatedByTest = created;
      });
    });

    cy.then(() => {
      if (skipTest) return;
      return findExistingProjectByPrefix(testData.projectNamePrefix).then((existingProject) => {
        if (existingProject) {
          cy.log(`Reusing existing tenant project: ${existingProject}`);
          evaluationTenantProject = existingProject;
          vllmEndpointUrl = getVllmEndpointUrl(testData, existingProject);
          return;
        }

        evaluationTenantProject = `${testData.projectNamePrefix}-${uuid}`;
        cy.step(`Create ephemeral project ${evaluationTenantProject}`);
        createCleanProject(evaluationTenantProject);

        return waitForProjectReady(evaluationTenantProject).then(() => {
          addUserToProject(evaluationTenantProject, LDAP_ADMIN_USER.USERNAME, 'admin');
          setupTenantAndDeployModel(evaluationTenantProject, testData, hardwareProfileName);
          grantEvalHubTenantAccess(evaluationTenantProject, LDAP_ADMIN_USER.USERNAME);
          vllmEndpointUrl = getVllmEndpointUrl(testData, evaluationTenantProject);
          cy.log(`vLLM endpoint: ${vllmEndpointUrl}`);
        });
      });
    });
  });

  after(() => {
    if (skipTest) {
      return;
    }

    if (evaluationTenantProject) {
      cy.step(`Delete ephemeral tenant project ${evaluationTenantProject}`);
      deleteOpenShiftProject(evaluationTenantProject, { wait: false, ignoreNotFound: true });
    }

    if (hardwareProfileName) {
      cy.step(`Clean up Hardware Profile: ${hardwareProfileName}`);
      cleanupHardwareProfiles(hardwareProfileName);
    }

    if (evalHubCrCreatedByTest) {
      cy.step(`Delete EvalHub CR ${evalHubCrName} created by this suite`);
      deleteEvalHubCr(evalHubCrName);
      deleteEvalHubE2eDatabaseSecret();
    }

    if (mlflowCrCreatedByTest) {
      cy.step('Delete MLflow CR created by this suite');
      deleteMlflowCr();
    }
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

      const {
        benchmarkCardTitle,
        inferenceModelName,
        defaultExperimentName,
        additionalBenchmarkParams,
        projectNamePrefix,
      } = testData;
      const extraParams = additionalBenchmarkParams.trim();
      const evaluationRunName = `e2e-eval-${evaluationTenantProject.replace(
        `${projectNamePrefix}-`,
        '',
      )}`;

      cy.step('Log into the application');
      cy.visitWithLogin('/', LDAP_ADMIN_USER);

      cy.step('Open Evaluations page');
      cy.visit(evaluationsPage.pathWithLmEvalDevFlags(evaluationTenantProject));
      evaluationsPage.assertEvaluationsShellVisible(evaluationTenantProject);

      cy.step('Create new evaluation → single benchmark');
      evalHubEvaluationFlow.openCreateEvaluationFromList();
      evalHubEvaluationFlow.selectSingleBenchmarkEntry();

      cy.step(`Select benchmark: ${benchmarkCardTitle}`);
      evalHubEvaluationFlow.startRunForBenchmarkCardContaining(benchmarkCardTitle);

      cy.step('Fill evaluation form');
      evalHubEvaluationFlow.findBenchmarkNameDisplay().should('contain.text', benchmarkCardTitle);
      evalHubEvaluationFlow.findEvaluationNameInput().clear().type(evaluationRunName);
      evalHubEvaluationFlow.findExperimentModeNew().should('be.checked');
      evalHubEvaluationFlow
        .findNewExperimentNameInput()
        .should('have.value', defaultExperimentName);
      evalHubEvaluationFlow.findInputModeInference().should('be.checked');

      cy.step('Enter model details');
      evalHubEvaluationFlow.findModelNameInput().clear().type(inferenceModelName);
      evalHubEvaluationFlow.findEndpointUrlInput().clear().type(vllmEndpointUrl);

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
      evaluationsPage.assertEvaluationComplete(evaluationRunName, evaluationTenantProject);
    },
  );
});
