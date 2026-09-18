import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { autoragConfigurePage } from '../../../pages/autorag/configurePage';
import { cleanupAutoragInfrastructure } from '../../../utils/oc_commands/autoragInfra';
import type { AutoragTestData } from '../../../types';
import {
  configureAutoragRun,
  checkAutoragMaaSReadiness,
  submitAutoragRun,
  getAutoragInputDataKey,
  waitForAutoragRunCompletion,
  verifyAutoragResultsInteraction,
} from '../../../utils/autoragTestFlows';
import type {
  AutoragConnectionOwnership,
  AutoragMaaSFixture,
} from '../../../utils/autoragTestFlows';

const uuid = generateTestUUID();

describe('AutoRAG Optimization E2E', () => {
  let testData: AutoragTestData;
  let projectName: string;
  let cleanupReady = false;
  let maasFixture: AutoragMaaSFixture | undefined;
  const connectionOwnership: AutoragConnectionOwnership = {
    maasSecretCreated: false,
    vectorDbSecretCreated: false,
  };
  const getMaaSFixture = (): AutoragMaaSFixture => {
    if (!maasFixture) {
      throw new Error('AutoRAG MaaS fixture was not resolved.');
    }
    return maasFixture;
  };

  retryableBefore(() =>
    cy
      .fixture('e2e/autorag/testAutoragOptimization.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as AutoragTestData;
        projectName = `${testData.projectNamePrefix}-${uuid}`;
        cleanupReady = true;
      })
      .then(() => checkAutoragMaaSReadiness())
      .then((fixture) => {
        maasFixture = fixture;
        provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);
      }),
  );

  after(() => {
    if (!cleanupReady) {
      return;
    }

    cleanupAutoragInfrastructure(
      projectName,
      testData.maasSecretName,
      testData.vectorDbSecretName,
      connectionOwnership,
    );
    deleteS3TestFiles(projectName, testData.awsBucket, `*${uuid}*`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Can configure and submit an AutoRAG optimization run',
    {
      tags: [
        '@AutoRAG',
        '@AutoRAGCI',
        '@AutoRAGRegression',
        '@AutoRAGOptimization',
        '@Featureflagged',
      ],
    },
    () => {
      configureAutoragRun(testData, projectName, uuid, getMaaSFixture(), {
        createConnections: true,
        connectionOwnership,
      });

      cy.step('Select faithfulness optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('faithfulness').click();

      cy.step('Set max RAG patterns to minimize run time');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun(
        testData,
        projectName,
        getAutoragInputDataKey(testData, uuid),
        getMaaSFixture(),
      );
    },
  );
});

describe('AutoRAG Optimization completion results E2E', () => {
  const completionUuid = generateTestUUID();
  let testData: AutoragTestData;
  let projectName: string;
  let cleanupReady = false;
  let maasFixture: AutoragMaaSFixture | undefined;
  const connectionOwnership: AutoragConnectionOwnership = {
    maasSecretCreated: false,
    vectorDbSecretCreated: false,
  };
  const getMaaSFixture = (): AutoragMaaSFixture => {
    if (!maasFixture) {
      throw new Error('AutoRAG MaaS fixture was not resolved.');
    }
    return maasFixture;
  };

  retryableBefore(() =>
    cy
      .fixture('e2e/autorag/testAutoragOptimization.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as AutoragTestData;
        projectName = `${testData.projectNamePrefix}-${completionUuid}`;
        cleanupReady = true;
      })
      .then(() => checkAutoragMaaSReadiness())
      .then((fixture) => {
        maasFixture = fixture;
        provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);
      }),
  );

  after(() => {
    if (!cleanupReady) {
      return;
    }

    cleanupAutoragInfrastructure(
      projectName,
      testData.maasSecretName,
      testData.vectorDbSecretName,
      connectionOwnership,
    );
    deleteS3TestFiles(projectName, testData.awsBucket, `*${completionUuid}*`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Verify optimization run completes and results are interactive',
    {
      tags: ['@AutoRAG', '@AutoRAGRegression', '@Featureflagged'],
      retries: { runMode: 0, openMode: 0 },
    },
    function verifyCompletionResults() {
      const fixture = getMaaSFixture();
      if (!fixture.supportsCompletionResults) {
        Cypress.log({
          name: 'skip',
          message: 'Results/leaderboard validation requires a real vector database.',
        });
        this.skip();
      }

      configureAutoragRun(testData, projectName, completionUuid, fixture, {
        createConnections: true,
        connectionOwnership,
      });

      cy.step('Select faithfulness optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('faithfulness').click();

      cy.step('Set max RAG patterns to minimize run time');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun(
        testData,
        projectName,
        getAutoragInputDataKey(testData, completionUuid),
        fixture,
      ).then(() => {
        waitForAutoragRunCompletion();
        verifyAutoragResultsInteraction();
      });
    },
  );
});
