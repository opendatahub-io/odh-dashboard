import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { AutomlTestData } from '../../../types';
import { automlConfigurePage } from '../../../pages/automl/configurePage';
import { isAutomlEnabled, setAutomlEnabled } from '../../../utils/oc_commands/autoX';
import {
  configureAutomlRun,
  submitAutomlRun,
  waitForAutomlRunCompletion,
  verifyAutomlResultsInteraction,
  verifyAndChangeOptimizationMetric,
} from '../../../utils/automlTestFlows';

const uuid = generateTestUUID();

describe('AutoML Multiclass Classification E2E', { testIsolation: false }, () => {
  let testData: AutomlTestData;
  let projectName: string;
  let automlWasEnabled = false;

  retryableBefore(() =>
    cy
      .fixture('e2e/automl/testAutomlMulticlassClassification.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as AutomlTestData;
        projectName = `${testData.projectNamePrefix}-${uuid}`;
      })
      .then(() =>
        isAutomlEnabled().then((wasEnabled) => {
          automlWasEnabled = wasEnabled;
        }),
      )
      .then(() => setAutomlEnabled(true))
      .then(() => {
        provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);
      }),
  );

  after(() => {
    if (!automlWasEnabled) {
      setAutomlEnabled(false);
    }
    deleteS3TestFiles(projectName, testData.awsBucket, `*${uuid}*`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Can create and submit an AutoML multiclass classification run',
    {
      tags: ['@AutoML', '@AutoMLRegression', '@Featureflagged'],
      retries: { runMode: 0, openMode: 0 },
    },
    () => {
      configureAutomlRun(testData, projectName, uuid);

      cy.step('Select target column');
      automlConfigurePage.findTargetColumnSelect().should('not.be.disabled').click();
      automlConfigurePage.findSelectOption(new RegExp(testData.labelColumn as string)).click();

      cy.step('Select Multiclass Classification prediction type');
      automlConfigurePage.findTaskTypeCard('multiclass').click();

      cy.step('Verify run preset defaults to Faster');
      automlConfigurePage.findPresetRadio('speed').should('be.checked');

      cy.step('Set top N models to minimize run time');
      automlConfigurePage.findTopNInputField().type(`{selectall}${testData.topN as number}`);

      verifyAndChangeOptimizationMetric(
        testData.defaultMetricLabel as string,
        testData.changedMetricKey as string,
        testData.changedMetricLabel as string,
      );

      submitAutomlRun();

      cy.step('Wait for run to complete and verify leaderboard');
      waitForAutomlRunCompletion();
    },
  );

  it(
    'Can interact with results page (leaderboard, model details, download)',
    { tags: ['@AutoML', '@AutoMLRegression', '@Featureflagged'] },
    () => {
      verifyAutomlResultsInteraction('multiclass');
    },
  );
});
