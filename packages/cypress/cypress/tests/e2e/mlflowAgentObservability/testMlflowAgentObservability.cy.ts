import {
  enableMlflowFeatures,
  disableMlflowFeatures,
  deleteMlflowExperimentViaAPI,
  findAvailableExperimentSuffix,
  getMlflowExperimentIdByName,
} from '../../../utils/oc_commands/mlflow';
import { deleteOpenShiftProject, createOpenShiftProject } from '../../../utils/oc_commands/project';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { loadMlflowAgentObservabilityFixture } from '../../../utils/dataLoader';
import { agentObservability } from '../../../pages/agentObservability';
import type { MlflowAgentObservabilityTestData } from '../../../types';

describe('Verify MLflow Agent observability page', () => {
  let testData: MlflowAgentObservabilityTestData;
  let projectName: string;
  let experimentName: string;
  const uuid = generateTestUUID();

  retryableBefore(() => {
    loadMlflowAgentObservabilityFixture(
      'e2e/mlflowAgentObservability/testMlflowAgentObservability.yaml',
    )
      .then((fixtureData) => {
        testData = fixtureData;
        projectName = `${fixtureData.projectName}-${uuid}`;
        return deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true });
      })
      .then(() => createOpenShiftProject(projectName))
      .then(() => {
        cy.step('Enable all features required for MLflow Agent observability');
        return enableMlflowFeatures();
      })
      .then(() => {
        cy.step('Find available experiment suffix to avoid stale name collisions');
        return findAvailableExperimentSuffix(projectName, [testData.experimentName], uuid);
      })
      .then((suffix) => {
        experimentName = `${testData.experimentName}-${suffix}`;
      });
  });

  after(() => {
    if (experimentName) {
      getMlflowExperimentIdByName(projectName, experimentName).then((id) => {
        if (id) {
          deleteMlflowExperimentViaAPI(projectName, id);
        }
      });
    }
    disableMlflowFeatures();
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Verify Agent observability shows experiments in the GenAI view',
    {
      tags: ['@MLflow', '@MLflowAgentObservability', '@NonConcurrent', '@MLflowEmbeddedCI'],
    },
    () => {
      cy.step('Navigate to Agent observability page with workspace');
      agentObservability.visit(projectName);

      cy.step('Wait for embedded MLflow UI to load');
      agentObservability.waitForEmbeddedContent();
      agentObservability.findMlflowUnavailableState().should('not.exist');

      cy.step('Create an experiment from the Agent observability page');
      agentObservability.findCreateExperimentButton().should('be.visible').and('be.enabled');
      agentObservability.findCreateExperimentButton().click();
      agentObservability.findExperimentNameInput().should('be.visible').type(experimentName);
      agentObservability.findCreateDialogSubmitButton().click();
      agentObservability.findExperimentDetailHeading(experimentName).should('be.visible');

      cy.step('Verify the GenAI / Model training toggle is not shown');
      agentObservability.findExperimentTypeToggleItem('Model training').should('not.exist');

      cy.step('Verify GenAI tabs are visible with Usage selected');
      agentObservability.findUsageTab().should('be.visible');
      agentObservability.findQualityTab().should('be.visible');
      agentObservability.findToolCallsTab().should('be.visible');
      agentObservability.shouldHaveUsageTabSelected();

      cy.step('Verify breadcrumbs start at Agent observability');
      agentObservability.findBreadcrumb().scrollIntoView().should('be.visible');
      agentObservability.findBreadcrumbItem('Agent observability').should('be.visible');
      agentObservability.findBreadcrumbItem(experimentName).should('be.visible');

      cy.step('Navigate back via breadcrumbs');
      agentObservability.findBreadcrumbItem('Agent observability').click();
      agentObservability.findExperimentsSearchInput().should('be.visible');
      agentObservability.findExperimentInTable(experimentName).should('be.visible');
      agentObservability.shouldHaveWorkspace(projectName);
    },
  );
});
