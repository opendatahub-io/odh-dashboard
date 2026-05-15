import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { AutomlTestData } from '../../../types';
import { automlConfigurePage, automlResultsPage } from '../../../pages/automl';
import { isAutomlEnabled, setAutomlEnabled } from '../../../utils/oc_commands/autoX';

const uuid = generateTestUUID();

describe('AutoML Time Series Forecasting E2E', { testIsolation: false }, () => {
  let testData: AutomlTestData;
  let projectName: string;
  let automlWasEnabled = false;

  retryableBefore(() =>
    cy
      .fixture('e2e/automl/testAutomlTimeseries.yaml', 'utf8')
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
    'Can create and submit an AutoML time series forecasting run',
    { tags: ['@AutoML', '@AutoMLRegression'] },
    () => {
      automlConfigurePage.submitRunSetup(testData, projectName, uuid);

      cy.step('Select Time Series Forecasting prediction type');
      automlConfigurePage.findTaskTypeCard('timeseries').click();

      cy.step('Select target column');
      automlConfigurePage.findTargetColumnSelect().should('not.be.disabled').click();
      automlConfigurePage.findSelectOption(new RegExp(testData.targetColumn as string)).click();

      cy.step('Select timestamp column');
      automlConfigurePage.findTimestampColumnSelect().should('not.be.disabled').click();
      automlConfigurePage.findSelectOption(new RegExp(testData.timestampColumn as string)).click();

      cy.step('Select ID column');
      automlConfigurePage.findIdColumnSelect().should('not.be.disabled').click();
      automlConfigurePage.findSelectOption(new RegExp(testData.idColumn as string)).click();

      cy.step('Set top N models to minimize run time');
      automlConfigurePage.setTopN(testData.topN as number);

      automlConfigurePage.submitRun();

      cy.step('Wait for run to complete and verify leaderboard');
      automlResultsPage.waitForRunCompletion();
    },
  );

  it(
    'Can interact with results page (leaderboard, model details, download)',
    { tags: ['@AutoML', '@AutoMLRegression'] },
    () => {
      automlResultsPage.verifyResultsInteraction('timeseries');
    },
  );
});
