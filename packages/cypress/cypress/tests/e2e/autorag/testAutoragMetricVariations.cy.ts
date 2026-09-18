import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { AutoragTestData } from '../../../types';
import { autoragConfigurePage } from '../../../pages/autorag/configurePage';
import { cleanupAutoragInfrastructure } from '../../../utils/oc_commands/autoragInfra';
import {
  configureAutoragRun,
  checkAutoragMaaSReadiness,
  submitAutoragRun,
  getAutoragInputDataKey,
} from '../../../utils/autoragTestFlows';
import type {
  AutoragConnectionOwnership,
  AutoragMaaSFixture,
} from '../../../utils/autoragTestFlows';

const uuid = generateTestUUID();
const defaultUuid = `${uuid}-default`;
const faithUuid = `${uuid}-faith`;
const overallUuid = `${uuid}-overall`;

describe('AutoRAG Metric Variations E2E', { testIsolation: false }, () => {
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
      .fixture('e2e/autorag/testAutoragMetricVariations.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as AutoragTestData;
        projectName = `${testData.projectNamePrefix}-${uuid}`;
        cleanupReady = true;
      })
      .then(() => checkAutoragMaaSReadiness())
      .then((fixture) => {
        maasFixture = fixture;
        provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);
        configureAutoragRun(testData, projectName, uuid, fixture, {
          createConnections: true,
          connectionOwnership,
        });
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
    'Can submit a run with untouched default metric (overall_score)',
    { tags: ['@AutoRAG', '@AutoRAGRegression', '@Featureflagged'] },
    () => {
      configureAutoragRun(
        { ...testData, runName: `${testData.runName}-default` },
        projectName,
        defaultUuid,
        getMaaSFixture(),
        {},
      );

      cy.step('Set max RAG patterns without changing the default metric');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun(
        { ...testData, runName: `${testData.runName}-default` },
        projectName,
        getAutoragInputDataKey(testData, defaultUuid),
        getMaaSFixture(),
      );
    },
  );

  it(
    'Can submit a run with answer_correctness metric',
    { tags: ['@AutoRAG', '@AutoRAGRegression', '@Featureflagged'] },
    () => {
      configureAutoragRun(testData, projectName, uuid, getMaaSFixture());

      cy.step('Select answer_correctness optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('answer_correctness').click();

      cy.step('Set max RAG patterns');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun(
        { ...testData, optimizationMetric: 'answer_correctness' },
        projectName,
        getAutoragInputDataKey(testData, uuid),
        getMaaSFixture(),
      );
    },
  );

  it(
    'Can submit a run with faithfulness metric',
    { tags: ['@AutoRAG', '@AutoRAGRegression', '@Featureflagged'] },
    () => {
      configureAutoragRun(
        { ...testData, runName: `${testData.runName}-faith` },
        projectName,
        faithUuid,
        getMaaSFixture(),
        {},
      );

      cy.step('Select faithfulness optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('faithfulness').click();

      cy.step('Set max RAG patterns');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun(
        { ...testData, runName: `${testData.runName}-faith`, optimizationMetric: 'faithfulness' },
        projectName,
        getAutoragInputDataKey(testData, faithUuid),
        getMaaSFixture(),
      );
    },
  );

  it(
    'Can submit a run with overall_score metric',
    { tags: ['@AutoRAG', '@AutoRAGRegression', '@Featureflagged'] },
    () => {
      configureAutoragRun(
        { ...testData, runName: `${testData.runName}-overall` },
        projectName,
        overallUuid,
        getMaaSFixture(),
        {},
      );

      cy.step('Select overall_score optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('overall_score').click();

      cy.step('Set max RAG patterns');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun(
        { ...testData, runName: `${testData.runName}-overall` },
        projectName,
        getAutoragInputDataKey(testData, overallUuid),
        getMaaSFixture(),
      );
    },
  );
});
