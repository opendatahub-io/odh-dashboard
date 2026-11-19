import type { AutomlConfigurationTestData } from '../../../types';
import { automlConfigurePage } from '../../../pages/automl/configurePage';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import {
  configureAutomlPredictionType,
  configureAutomlRun,
  uploadAutomlTrainingDataFile,
  verifyAndChangeOptimizationMetric,
} from '../../../utils/automlTestFlows';
import { loadAutomlConfigurationFixture, loadAutomlFixture } from '../../../utils/dataLoader';
import { deleteAutoXS3TestFiles } from '../../../utils/oc_commands/autoXS3Cleanup';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { retryableBefore, wasSetupPerformed } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';

const uuid = generateTestUUID();

describe('AutoML prediction type configuration E2E', () => {
  let configuration: AutomlConfigurationTestData;
  let projectName: string;

  before(() =>
    loadAutomlConfigurationFixture('e2e/automl/testAutomlConfiguration.yaml').then((data) => {
      configuration = data;
      projectName = `${data.projectNamePrefix}-${uuid}`;
    }),
  );

  retryableBefore(() => {
    provisionProjectForAutoX(projectName, configuration.dspaSecretName, configuration.awsBucket);
  });

  after(() => {
    if (!wasSetupPerformed()) {
      return;
    }
    deleteAutoXS3TestFiles(projectName, configuration.awsBucket, `*${uuid}*`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  const verifyPredictionTypeConfiguration = (fixtureFile: string): void => {
    loadAutomlFixture(`e2e/automl/${fixtureFile}`).then((testData) => {
      configureAutomlRun(testData, projectName, `${uuid}-${testData.taskType}`);
      configureAutomlPredictionType(testData);

      const { taskType, defaultMetricLabel, changedMetricKey, changedMetricLabel } = testData;
      const defaultMetricKey = configuration.defaultMetricKeys[taskType];
      const isTimeseries = taskType === 'timeseries';
      const presets = isTimeseries ? configuration.timeseriesPresets : configuration.tabularPresets;
      const maxTopN = isTimeseries
        ? configuration.topModels.timeseriesMax
        : configuration.topModels.tabularMax;

      cy.step('Verify the initial configuration is valid and uses the default preset');
      automlConfigurePage.findCreateRunButton().should('be.enabled');
      automlConfigurePage.findPresetRadio(configuration.defaultPreset).should('be.checked');

      cy.step('Verify cancelling an optimization metric change preserves the saved value');
      automlConfigurePage.findOptimizationMetricEditButton().click();
      automlConfigurePage.findEvalMetricRadio(defaultMetricKey).should('be.checked');
      automlConfigurePage.findEvalMetricRadio(changedMetricKey as string).click();
      automlConfigurePage.findOptimizationMetricCancelButton().click();
      automlConfigurePage.findOptimizationMetricModal().should('not.exist');
      automlConfigurePage.findOptimizationMetricValue().should('contain.text', defaultMetricLabel);

      verifyAndChangeOptimizationMetric(
        defaultMetricLabel as string,
        changedMetricKey as string,
        changedMetricLabel as string,
      );

      cy.step('Verify the saved metric is selected when reopening the dialog');
      automlConfigurePage.findOptimizationMetricEditButton().click();
      automlConfigurePage.findEvalMetricRadio(changedMetricKey as string).should('be.checked');
      automlConfigurePage.findOptimizationMetricCancelButton().click();

      cy.step('Change each supported run preset and verify other settings are preserved');
      // These controlled numeric inputs ignore empty values; replace the selection in one edit.
      automlConfigurePage.findTopNInputField().type(`{selectall}${configuration.topModels.min}`);
      presets.forEach((preset) => {
        automlConfigurePage.findPresetRadio(preset).should('be.visible').click();
        automlConfigurePage.findPresetRadio(preset).should('be.checked');
        presets
          .filter((otherPreset) => otherPreset !== preset)
          .forEach((otherPreset) => {
            automlConfigurePage.findPresetRadio(otherPreset).should('not.be.checked');
          });
        automlConfigurePage.findTaskTypeRadio(taskType).should('be.checked');
        automlConfigurePage.findTopNInputField().should('have.value', configuration.topModels.min);
        automlConfigurePage
          .findOptimizationMetricValue()
          .should('contain.text', changedMetricLabel);
        automlConfigurePage.findCreateRunButton().should('be.enabled');
      });
      if (isTimeseries) {
        automlConfigurePage
          .findPresetRadio(configuration.unsupportedTimeseriesPreset)
          .should('not.exist');
      }

      cy.step('Reject top-model counts outside the limits for this prediction type');
      [configuration.topModels.min - 1, maxTopN + 1].forEach((value) => {
        automlConfigurePage.findTopNInputField().type(`{selectall}${value}`).blur();
        automlConfigurePage.findTopNInputField().should('have.value', value);
        automlConfigurePage.findTopNInputField().should('have.attr', 'aria-invalid', 'true');
        automlConfigurePage.findCreateRunButton().should('be.disabled');
      });

      cy.step('Accept both boundaries of the top-model count');
      [configuration.topModels.min, maxTopN].forEach((value) => {
        automlConfigurePage.findTopNInputField().type(`{selectall}${value}`).blur();
        automlConfigurePage.findTopNInputField().should('have.value', value);
        automlConfigurePage.findCreateRunButton().should('be.enabled');
      });
    });
  };

  const verifyInvalidCsvRecovery = (
    datasetKey: keyof AutomlConfigurationTestData['invalidDatasets'],
  ): void => {
    loadAutomlFixture('e2e/automl/testAutomlBinaryClassification.yaml').then((testData) => {
      const invalidDataset = configuration.invalidDatasets[datasetKey];
      configureAutomlRun(
        { ...testData, trainingDataFile: invalidDataset.trainingDataFile },
        projectName,
        `${uuid}-${datasetKey}`,
        { selectFromBucket: false },
      );

      cy.step('Show the CSV validation error and prevent configuring a run');
      automlConfigurePage
        .findTargetColumnFormGroup()
        .should('contain.text', invalidDataset.errorMessage);
      automlConfigurePage.findTargetColumnSelect().should('be.disabled');
      automlConfigurePage.findPredictionTypeHelperWithoutTarget().should('be.visible');
      automlConfigurePage.findCreateRunButton().should('be.disabled');

      cy.step('Replace the invalid CSV with valid training data');
      uploadAutomlTrainingDataFile(testData.trainingDataFile, `${uuid}-${datasetKey}-recovery`);
      automlConfigurePage.findTargetColumnSelect().should('be.enabled');
      automlConfigurePage
        .findTargetColumnFormGroup()
        .should('not.contain.text', invalidDataset.errorMessage);
      automlConfigurePage.findCreateRunButton().should('be.disabled');

      cy.step('Select a target and verify the form recovers without reloading');
      configureAutomlPredictionType(testData);
      automlConfigurePage.findCreateRunButton().should('be.enabled');
    });
  };

  it(
    'Can change presets, cancel metric changes, and validate model limits for binary classification',
    {
      tags: [
        '@AutoML',
        '@AutoMLCI',
        '@AutoMLConfiguration',
        '@AutoMLRegression',
        '@Featureflagged',
      ],
    },
    () => verifyPredictionTypeConfiguration('testAutomlBinaryClassification.yaml'),
  );

  it(
    'Can change presets, cancel metric changes, and validate model limits for multiclass classification',
    {
      tags: [
        '@AutoML',
        '@AutoMLCI',
        '@AutoMLConfiguration',
        '@AutoMLRegression',
        '@Featureflagged',
      ],
    },
    () => verifyPredictionTypeConfiguration('testAutomlMulticlassClassification.yaml'),
  );

  it(
    'Can change presets, cancel metric changes, and validate model limits for regression',
    {
      tags: [
        '@AutoML',
        '@AutoMLCI',
        '@AutoMLConfiguration',
        '@AutoMLRegression',
        '@Featureflagged',
      ],
    },
    () => verifyPredictionTypeConfiguration('testAutomlRegression.yaml'),
  );

  it(
    'Can change presets, cancel metric changes, and validate model limits for time series',
    {
      tags: [
        '@AutoML',
        '@AutoMLCI',
        '@AutoMLConfiguration',
        '@AutoMLRegression',
        '@Featureflagged',
      ],
    },
    () => verifyPredictionTypeConfiguration('testAutomlTimeseries.yaml'),
  );

  it(
    'Updates presets, metrics, required columns, and model limits when changing prediction type',
    {
      tags: [
        '@AutoML',
        '@AutoMLCI',
        '@AutoMLConfiguration',
        '@AutoMLRegression',
        '@Featureflagged',
      ],
    },
    () => {
      loadAutomlFixture('e2e/automl/testAutomlRegression.yaml').then((regressionData) => {
        loadAutomlFixture('e2e/automl/testAutomlTimeseries.yaml').then((timeseriesData) => {
          configureAutomlRun(timeseriesData, projectName, `${uuid}-switch-type`);
          configureAutomlPredictionType({ ...timeseriesData, idColumn: undefined });

          cy.step('Require an ID column for a dataset with more than two columns');
          automlConfigurePage.findIdColumnSelect().should('be.enabled');
          automlConfigurePage.findCreateRunButton().should('be.disabled');
          automlConfigurePage.findIdColumnSelect().click();
          automlConfigurePage.findSelectOption(timeseriesData.idColumn as string).click();
          automlConfigurePage.findCreateRunButton().should('be.enabled');

          cy.step('Configure regression with the Best quality preset and its maximum model count');
          automlConfigurePage.findTaskTypeCard(regressionData.taskType).click();
          automlConfigurePage.findTimestampColumnSelect().should('not.exist');
          automlConfigurePage.findIdColumnSelect().should('not.exist');
          automlConfigurePage.findPresetRadio(configuration.unsupportedTimeseriesPreset).click();
          automlConfigurePage
            .findPresetRadio(configuration.unsupportedTimeseriesPreset)
            .should('be.checked');
          automlConfigurePage
            .findTopNInputField()
            .type(`{selectall}${configuration.topModels.tabularMax}`);
          automlConfigurePage
            .findTopNInputField()
            .should('have.value', configuration.topModels.tabularMax);
          verifyAndChangeOptimizationMetric(
            regressionData.defaultMetricLabel as string,
            regressionData.changedMetricKey as string,
            regressionData.changedMetricLabel as string,
          );
          automlConfigurePage.findCreateRunButton().should('be.enabled');

          cy.step('Switch to time series: reset the unsupported preset and revalidate model count');
          automlConfigurePage.findTaskTypeCard(timeseriesData.taskType).click();
          automlConfigurePage
            .findPresetRadio(configuration.unsupportedTimeseriesPreset)
            .should('not.exist');
          automlConfigurePage.findPresetRadio(configuration.defaultPreset).should('be.checked');
          automlConfigurePage.findTopNInputField().should('have.attr', 'aria-invalid', 'true');
          automlConfigurePage.findCreateRunButton().should('be.disabled');

          cy.step('Preserve RMSE using the metric key for the new prediction type');
          automlConfigurePage
            .findOptimizationMetricValue()
            .should('contain.text', timeseriesData.changedMetricLabel);
          automlConfigurePage.findOptimizationMetricEditButton().click();
          automlConfigurePage
            .findEvalMetricRadio(timeseriesData.changedMetricKey as string)
            .should('be.checked');
          automlConfigurePage
            .findEvalMetricRadio(regressionData.changedMetricKey as string)
            .should('not.exist');
          automlConfigurePage.findOptimizationMetricCancelButton().click();

          cy.step('Restore a valid time-series configuration');
          automlConfigurePage
            .findTopNInputField()
            .type(`{selectall}${configuration.topModels.timeseriesMax}`);
          automlConfigurePage
            .findTopNInputField()
            .should('have.value', configuration.topModels.timeseriesMax);
          automlConfigurePage.findTimestampColumnSelect().click();
          automlConfigurePage.findSelectOption(timeseriesData.timestampColumn as string).click();
          automlConfigurePage.findCreateRunButton().should('be.enabled');

          cy.step('Reset a metric that is unavailable for the new prediction type');
          verifyAndChangeOptimizationMetric(
            timeseriesData.changedMetricLabel as string,
            configuration.defaultMetricKeys.timeseries,
            timeseriesData.defaultMetricLabel as string,
          );
          automlConfigurePage.findTaskTypeCard(regressionData.taskType).click();
          automlConfigurePage
            .findOptimizationMetricValue()
            .should('contain.text', regressionData.defaultMetricLabel);

          cy.step('Preserve Better quality when switching between supported prediction types');
          automlConfigurePage.findPresetRadio(configuration.preservedPreset).click();
          automlConfigurePage.findPresetRadio(configuration.preservedPreset).should('be.checked');
          automlConfigurePage.findTaskTypeCard(timeseriesData.taskType).click();
          automlConfigurePage.findPresetRadio(configuration.preservedPreset).should('be.checked');
        });
      });
    },
  );

  it(
    'Can configure time series without an ID column and validate prediction length',
    {
      tags: [
        '@AutoML',
        '@AutoMLCI',
        '@AutoMLConfiguration',
        '@AutoMLRegression',
        '@Featureflagged',
      ],
    },
    () => {
      loadAutomlFixture('e2e/automl/testAutomlTimeseries.yaml').then((testData) => {
        const singleSeriesData = {
          ...testData,
          trainingDataFile: configuration.singleSeriesTrainingDataFile,
          idColumn: undefined,
        };
        configureAutomlRun(singleSeriesData, projectName, `${uuid}-single-series`);
        configureAutomlPredictionType(singleSeriesData);

        cy.step('Automatically generate the ID for a two-column time-series dataset');
        automlConfigurePage
          .findIdColumnSelect()
          .should('be.disabled')
          .and('contain.text', configuration.autoGeneratedIdLabel);
        automlConfigurePage.findCreateRunButton().should('be.enabled');

        cy.step('Change the forecast prediction length');
        automlConfigurePage
          .findPredictionLengthInputField()
          .type(`{selectall}${configuration.predictionLength.changed}`);
        automlConfigurePage
          .findPredictionLengthInputField()
          .should('have.value', configuration.predictionLength.changed);
        automlConfigurePage.findCreateRunButton().should('be.enabled');

        cy.step('Reject prediction lengths outside the supported range');
        [configuration.predictionLength.min - 1, configuration.predictionLength.max + 1].forEach(
          (value) => {
            automlConfigurePage.findPredictionLengthInputField().type(`{selectall}${value}`).blur();
            automlConfigurePage.findPredictionLengthInputField().should('have.value', value);
            automlConfigurePage
              .findPredictionLengthInputField()
              .should('have.attr', 'aria-invalid', 'true');
            automlConfigurePage.findCreateRunButton().should('be.disabled');
          },
        );

        cy.step('Accept both boundaries of the prediction length');
        [configuration.predictionLength.min, configuration.predictionLength.max].forEach(
          (value) => {
            automlConfigurePage.findPredictionLengthInputField().type(`{selectall}${value}`).blur();
            automlConfigurePage.findPredictionLengthInputField().should('have.value', value);
            automlConfigurePage.findCreateRunButton().should('be.enabled');
          },
        );
      });
    },
  );
  [
    { title: 'binary classification', fixture: 'testAutomlBinaryClassification.yaml' },
    { title: 'multiclass classification', fixture: 'testAutomlMulticlassClassification.yaml' },
    { title: 'regression', fixture: 'testAutomlRegression.yaml' },
    { title: 'time series', fixture: 'testAutomlTimeseries.yaml' },
  ].forEach(({ title, fixture }) => {
    it(
      `Automatically recommends ${title} after selecting the target column`,
      {
        tags: [
          '@AutoML',
          '@AutoMLCI',
          '@AutoMLConfiguration',
          '@AutoMLRegression',
          '@Featureflagged',
        ],
      },
      () => {
        loadAutomlFixture(`e2e/automl/${fixture}`).then((testData) => {
          configureAutomlRun(testData, projectName, `${uuid}-${testData.taskType}-recommendation`);

          cy.step('Require a target before offering prediction types');
          automlConfigurePage.findPredictionTypeHelperWithoutTarget().should('be.visible');
          automlConfigurePage.findTaskTypeRadio(testData.taskType).should('not.exist');
          automlConfigurePage.findCreateRunButton().should('be.disabled');

          cy.step('Select only the target and verify the automatically selected prediction type');
          automlConfigurePage.findTargetColumnSelect().should('be.enabled').click();
          automlConfigurePage
            .findSelectOption((testData.labelColumn ?? testData.targetColumn) as string)
            .click();
          automlConfigurePage.findPredictionTypeHelperWithoutTarget().should('not.exist');
          automlConfigurePage.findTaskTypeRadio(testData.taskType).should('be.checked');
          automlConfigurePage
            .findRecommendedTaskTypeBadge(testData.taskType)
            .should('be.visible')
            .and('have.text', configuration.recommendedBadgeLabel);
          automlConfigurePage.findPresetRadio(configuration.defaultPreset).should('be.checked');
          automlConfigurePage
            .findOptimizationMetricValue()
            .should('contain.text', testData.defaultMetricLabel);

          if (testData.taskType === 'timeseries') {
            cy.step('Automatically select the timestamp while requiring an explicit series ID');
            automlConfigurePage
              .findTimestampColumnSelect()
              .should('contain.text', testData.timestampColumn);
            automlConfigurePage
              .findIdColumnSelect()
              .should('contain.text', configuration.columnPlaceholder);
            automlConfigurePage.findCreateRunButton().should('be.disabled');
            automlConfigurePage.findIdColumnSelect().click();
            automlConfigurePage.findSelectOption(testData.idColumn as string).click();
          }
          automlConfigurePage.findCreateRunButton().should('be.enabled');
        });
      },
    );
  });

  it(
    'Clears previous dataset selections and detects the replacement dataset columns',
    {
      tags: [
        '@AutoML',
        '@AutoMLCI',
        '@AutoMLConfiguration',
        '@AutoMLRegression',
        '@Featureflagged',
      ],
    },
    () => {
      loadAutomlFixture('e2e/automl/testAutomlTimeseries.yaml').then((testData) => {
        const replacement = configuration.replacementDataset;
        configureAutomlRun(testData, projectName, `${uuid}-before-replacement`, {
          selectFromBucket: false,
        });
        configureAutomlPredictionType(testData);
        automlConfigurePage
          .findPredictionLengthInputField()
          .type(`{selectall}${configuration.predictionLength.changed}`);
        automlConfigurePage
          .findPredictionLengthInputField()
          .should('have.value', configuration.predictionLength.changed);
        automlConfigurePage.findCreateRunButton().should('be.enabled');

        cy.step('Replace the CSV without changing the connection or upload mode');
        uploadAutomlTrainingDataFile(replacement.trainingDataFile, `${uuid}-after-replacement`);
        automlConfigurePage
          .findTargetColumnSelect()
          .should('be.enabled')
          .and('contain.text', configuration.columnPlaceholder);
        automlConfigurePage.findPredictionTypeHelperWithoutTarget().should('be.visible');
        automlConfigurePage.findTaskTypeRadio(testData.taskType).should('not.exist');
        automlConfigurePage.findTimestampColumnSelect().should('not.exist');
        automlConfigurePage.findIdColumnSelect().should('not.exist');
        automlConfigurePage.findCreateRunButton().should('be.disabled');

        cy.step('Offer the new target instead of columns from the previous CSV');
        automlConfigurePage.findTargetColumnSelect().click();
        automlConfigurePage.findSelectOption(testData.targetColumn as string).should('not.exist');
        automlConfigurePage.findSelectOption(replacement.targetColumn).click();
        automlConfigurePage.findTaskTypeRadio(testData.taskType).should('be.checked');
        automlConfigurePage
          .findTimestampColumnSelect()
          .should('contain.text', replacement.timestampColumn);
        automlConfigurePage
          .findIdColumnSelect()
          .should('be.enabled')
          .and('contain.text', configuration.columnPlaceholder);
        automlConfigurePage
          .findPredictionLengthInputField()
          .should('have.value', configuration.predictionLength.default);
        automlConfigurePage.findCreateRunButton().should('be.disabled');

        cy.step('Require an ID from the replacement dataset to restore a valid configuration');
        automlConfigurePage.findIdColumnSelect().click();
        automlConfigurePage.findSelectOption(testData.idColumn as string).should('not.exist');
        automlConfigurePage.findSelectOption(replacement.idColumn).click();
        automlConfigurePage.findCreateRunButton().should('be.enabled');
      });
    },
  );

  it(
    'Rejects a header-only CSV and recovers after uploading valid training data',
    {
      tags: [
        '@AutoML',
        '@AutoMLCI',
        '@AutoMLConfiguration',
        '@AutoMLRegression',
        '@Featureflagged',
      ],
    },
    () => verifyInvalidCsvRecovery('noDataRows'),
  );

  it(
    'Rejects a CSV with fewer than 100 rows and recovers after uploading valid training data',
    {
      tags: [
        '@AutoML',
        '@AutoMLCI',
        '@AutoMLConfiguration',
        '@AutoMLRegression',
        '@Featureflagged',
      ],
    },
    () => verifyInvalidCsvRecovery('insufficientRows'),
  );
});
