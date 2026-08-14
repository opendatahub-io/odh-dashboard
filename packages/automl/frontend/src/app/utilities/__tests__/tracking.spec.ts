import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  AUTOML_EVENTS,
  fireAutomlBacktestWindowMetricViewed,
  fireAutomlFlowExited,
  fireAutomlLeaderboardSorted,
  fireAutomlModelDetailsDownloaded,
  fireAutomlModelDetailsTabViewed,
  fireAutomlModelRegistered,
  fireAutomlNotebookDownloaded,
  fireAutomlRunCreated,
  fireAutomlRunDeleted,
  fireAutomlRunReconfigured,
  fireAutomlRunRetried,
  fireAutomlRunStopped,
  fireAutomlS3ConnectionCreated,
  mapModelDetailsTabName,
  mapOptimizationMetric,
  mapPredictionType,
} from '~/app/utilities/tracking';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

const fireFormTrackingEventMock = jest.mocked(fireFormTrackingEvent);
const fireMiscTrackingEventMock = jest.mocked(fireMiscTrackingEvent);

describe('mapPredictionType', () => {
  it('should map binary to binaryClassification', () => {
    expect(mapPredictionType('binary')).toBe('binaryClassification');
  });

  it('should map multiclass to multiclassClassification', () => {
    expect(mapPredictionType('multiclass')).toBe('multiclassClassification');
  });

  it('should map regression to regression', () => {
    expect(mapPredictionType('regression')).toBe('regression');
  });

  it('should map timeseries to timeSeriesForecasting', () => {
    expect(mapPredictionType('timeseries')).toBe('timeSeriesForecasting');
  });

  it('should pass through unknown task types unchanged', () => {
    expect(mapPredictionType('anomaly')).toBe('anomaly');
  });

  it('should return undefined for undefined input', () => {
    expect(mapPredictionType(undefined)).toBeUndefined();
  });

  it('should return undefined for empty string input', () => {
    expect(mapPredictionType('')).toBeUndefined();
  });
});

describe('mapOptimizationMetric', () => {
  it('should map accuracy to accuracy', () => {
    expect(mapOptimizationMetric('accuracy')).toBe('accuracy');
  });

  it('should map roc_auc to rocAuc', () => {
    expect(mapOptimizationMetric('roc_auc')).toBe('rocAuc');
  });

  it('should map f1 to f1Score', () => {
    expect(mapOptimizationMetric('f1')).toBe('f1Score');
  });

  it('should map log_loss to logLoss', () => {
    expect(mapOptimizationMetric('log_loss')).toBe('logLoss');
  });

  it('should map balanced_accuracy to balancedAccuracy', () => {
    expect(mapOptimizationMetric('balanced_accuracy')).toBe('balancedAccuracy');
  });

  it('should be case-insensitive', () => {
    expect(mapOptimizationMetric('ROC_AUC')).toBe('rocAuc');
  });

  it('should pass through metrics outside the fixed taxonomy unchanged (e.g. regression/timeseries metrics)', () => {
    expect(mapOptimizationMetric('r2')).toBe('r2');
    expect(mapOptimizationMetric('MASE')).toBe('MASE');
  });

  it('should return undefined for undefined input', () => {
    expect(mapOptimizationMetric(undefined)).toBeUndefined();
  });

  it('should return undefined for empty string input', () => {
    expect(mapOptimizationMetric('')).toBeUndefined();
  });
});

describe('mapModelDetailsTabName', () => {
  it('should map every tabConfig.ts tab key to a camelCase name', () => {
    expect(mapModelDetailsTabName('model-information')).toBe('modelInformation');
    expect(mapModelDetailsTabName('feature-summary')).toBe('featureSummary');
    expect(mapModelDetailsTabName('model-evaluation')).toBe('modelEvaluation');
    expect(mapModelDetailsTabName('confusion-matrix')).toBe('confusionMatrix');
    expect(mapModelDetailsTabName('roc-curve')).toBe('rocCurve');
    expect(mapModelDetailsTabName('precision-recall')).toBe('precisionRecall');
    expect(mapModelDetailsTabName('backtest-window')).toBe('backtestWindow');
  });

  it('should pass through unknown tab keys unchanged', () => {
    expect(mapModelDetailsTabName('some-future-tab')).toBe('some-future-tab');
  });
});

describe('AutoML tracking event firers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire AutoML Run Created via fireFormTrackingEvent with the given properties', () => {
    fireAutomlRunCreated({
      outcome: TrackingOutcome.submit,
      success: true,
      predictionType: 'binaryClassification',
      optimizationMetric: 'accuracy',
      isRecommended: true,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledTimes(1);
    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTOML_EVENTS.RUN_CREATED, {
      outcome: TrackingOutcome.submit,
      success: true,
      predictionType: 'binaryClassification',
      optimizationMetric: 'accuracy',
      isRecommended: true,
    });
  });

  it('should fire AutoML Run Reconfigured with changedFields joined into a comma-separated string', () => {
    fireAutomlRunReconfigured({
      outcome: TrackingOutcome.submit,
      success: true,
      predictionType: 'regression',
      optimizationMetric: 'r2',
      isRecommended: false,
      changedFields: ['predictionType', 'targetColumn'],
      source: 'resultsPage',
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTOML_EVENTS.RUN_RECONFIGURED,
      expect.objectContaining({
        changedFields: 'predictionType,targetColumn',
        source: 'resultsPage',
      }),
    );
  });

  it('should fire AutoML Run Reconfigured with an empty string when changedFields is empty', () => {
    fireAutomlRunReconfigured({
      outcome: TrackingOutcome.submit,
      success: false,
      isRecommended: false,
      changedFields: [],
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTOML_EVENTS.RUN_RECONFIGURED,
      expect.objectContaining({ changedFields: '' }),
    );
  });

  it('should fire AutoML Run Stopped with source', () => {
    fireAutomlRunStopped({ outcome: TrackingOutcome.cancel, source: 'runsList' });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTOML_EVENTS.RUN_STOPPED, {
      outcome: TrackingOutcome.cancel,
      source: 'runsList',
    });
  });

  it('should fire AutoML Run Retried', () => {
    fireAutomlRunRetried({ outcome: TrackingOutcome.submit, success: false, error: 'boom' });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTOML_EVENTS.RUN_RETRIED, {
      outcome: TrackingOutcome.submit,
      success: false,
      error: 'boom',
    });
  });

  it('should fire AutoML Run Deleted', () => {
    fireAutomlRunDeleted({ outcome: TrackingOutcome.submit, success: true, source: 'runsList' });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTOML_EVENTS.RUN_DELETED, {
      outcome: TrackingOutcome.submit,
      success: true,
      source: 'runsList',
    });
  });

  it('should fire AutoML Model Details Tab Viewed with the mapped tab name and predictionType', () => {
    fireAutomlModelDetailsTabViewed('roc-curve', 'binary');

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTOML_EVENTS.MODEL_DETAILS_TAB_VIEWED, {
      tabName: 'rocCurve',
      predictionType: 'binaryClassification',
    });
  });

  it('should fire AutoML Model Details Tab Viewed with undefined predictionType when taskType is omitted', () => {
    fireAutomlModelDetailsTabViewed('model-information');

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTOML_EVENTS.MODEL_DETAILS_TAB_VIEWED, {
      tabName: 'modelInformation',
      predictionType: undefined,
    });
  });

  it('should fire AutoML Backtest Window Metric Viewed with the raw metric name', () => {
    fireAutomlBacktestWindowMetricViewed('WQL');

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(
      AUTOML_EVENTS.BACKTEST_WINDOW_METRIC_VIEWED,
      { metricName: 'WQL' },
    );
  });

  it('should fire AutoML Notebook Downloaded with downloadType and source', () => {
    fireAutomlNotebookDownloaded('leaderboard');

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTOML_EVENTS.NOTEBOOK_DOWNLOADED, {
      downloadType: 'notebook',
      source: 'leaderboard',
    });
  });

  it('should fire AutoML Model Details Downloaded with downloadType', () => {
    fireAutomlModelDetailsDownloaded();

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTOML_EVENTS.MODEL_DETAILS_DOWNLOADED, {
      downloadType: 'modelDetails',
    });
  });

  it('should fire AutoML Model Registered with registryTarget and source', () => {
    fireAutomlModelRegistered({
      outcome: TrackingOutcome.submit,
      success: true,
      source: 'modelDetailsModal',
      registryTarget: 'my-registry',
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTOML_EVENTS.MODEL_REGISTERED, {
      outcome: TrackingOutcome.submit,
      success: true,
      source: 'modelDetailsModal',
      registryTarget: 'my-registry',
    });
  });

  it('should fire AutoML S3 Connection Created', () => {
    fireAutomlS3ConnectionCreated({ outcome: TrackingOutcome.cancel });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTOML_EVENTS.S3_CONNECTION_CREATED, {
      outcome: TrackingOutcome.cancel,
    });
  });

  it('should fire AutoML Leaderboard Sorted with sortColumn and sortDirection', () => {
    fireAutomlLeaderboardSorted('Model name', 'desc');

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTOML_EVENTS.LEADERBOARD_SORTED, {
      sortColumn: 'Model name',
      sortDirection: 'desc',
    });
  });

  it('should fire AutoML Flow Exited with exitType, lastFunnelStep, and exitDestination', () => {
    fireAutomlFlowExited('navigate', 'defineDetails', 'experimentsList');

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTOML_EVENTS.FLOW_EXITED, {
      exitType: 'navigate',
      lastFunnelStep: 'defineDetails',
      exitDestination: 'experimentsList',
    });
  });

  it('should fire AutoML Flow Exited with exitType: abandon and exitDestination: none', () => {
    fireAutomlFlowExited('abandon', 'trainingData', 'none');

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTOML_EVENTS.FLOW_EXITED, {
      exitType: 'abandon',
      lastFunnelStep: 'trainingData',
      exitDestination: 'none',
    });
  });
});
