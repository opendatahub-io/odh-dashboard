import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import {
  AUTOML_FAILURE_CATEGORY,
  fireAutomlBacktestWindowMetricViewed,
  fireAutomlFlowExited,
  fireAutomlLeaderboardSorted,
  fireAutomlModelDetailsDownloadInitiated,
  fireAutomlModelDetailsTabViewed,
  fireAutomlModelDetailsViewed,
  fireAutomlModelRegistered,
  fireAutomlNotebookDownloaded,
  fireAutomlProjectDropdownOptionSelected,
  fireAutomlRunCreated,
  fireAutomlRunDeleted,
  fireAutomlRunDetailsDefined,
  fireAutomlRunReconfigured,
  fireAutomlRunRetried,
  fireAutomlRunNotebookDownloaded,
  fireAutomlResultsViewed,
  fireAutomlRunStopped,
  fireAutomlS3ConnectionCreated,
  fireAutomlTargetColumnConfigured,
  fireAutomlTrainingDataConfigured,
  isAutomlResultsNavigationState,
  mapModelDetailsTabName,
  mapOptimizationMetric,
  mapPredictionType,
} from '~/app/utilities/tracking';

const trackEvent = jest.fn();

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

  it('should pass through inherited Object.prototype property names unchanged, not resolve them', () => {
    // 'toString' is `in` the map's prototype chain but is not an own property — a naive
    // `value in PREDICTION_TYPE_MAP` check would incorrectly treat it as a known task type
    // and return Object.prototype.toString (a function) instead of a string.
    const result = mapPredictionType('toString');
    expect(result).toBe('toString');
    expect(typeof result).toBe('string');
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

  it('should fire AutoML Project Dropdown Option Selected with the selected project', () => {
    fireAutomlProjectDropdownOptionSelected(trackEvent, 'test-namespace');

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('AutoML Project Dropdown Option Selected', {
      selectedProject: 'test-namespace',
    });
  });

  it('should fire AutoML Run Details Defined with outcome and hasDescription', () => {
    fireAutomlRunDetailsDefined(trackEvent, TrackingOutcome.submit, true);

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('AutoML Run Details Defined', {
      outcome: TrackingOutcome.submit,
      hasDescription: true,
    });
  });

  it('should fire AutoML Run Details Defined with outcome:cancel', () => {
    fireAutomlRunDetailsDefined(trackEvent, TrackingOutcome.cancel, false);

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('AutoML Run Details Defined', {
      outcome: TrackingOutcome.cancel,
      hasDescription: false,
    });
  });

  it('should fire AutoML Training Data Configured with the training data source type', () => {
    fireAutomlTrainingDataConfigured(trackEvent, 'upload');

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('AutoML Training Data Configured', {
      trainingDataSourceType: 'upload',
    });
  });

  it('should fire AutoML Target Column Configured with no properties', () => {
    fireAutomlTargetColumnConfigured(trackEvent);

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('AutoML Target Column Configured', {});
  });

  it('should fire AutoML Run Created through the injected callback with the given properties', () => {
    fireAutomlRunCreated(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      predictionType: 'binaryClassification',
      optimizationMetric: 'accuracy',
      isRecommended: true,
    });

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('AutoML Run Created', {
      outcome: TrackingOutcome.submit,
      success: true,
      predictionType: 'binaryClassification',
      optimizationMetric: 'accuracy',
      isRecommended: true,
    });
  });

  it('should fire AutoML Run Reconfigured with changedFields joined into a comma-separated string', () => {
    fireAutomlRunReconfigured(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      predictionType: 'regression',
      optimizationMetric: 'r2',
      isRecommended: false,
      changedFields: ['predictionType', 'targetColumn'],
      source: 'resultsPage',
    });

    expect(trackEvent).toHaveBeenCalledWith(
      'AutoML Run Reconfigured',
      expect.objectContaining({
        changedFields: 'predictionType,targetColumn',
        source: 'resultsPage',
      }),
    );
  });

  it('should fire AutoML Run Reconfigured with an empty string when changedFields is empty', () => {
    fireAutomlRunReconfigured(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: false,
      isRecommended: false,
      changedFields: [],
    });

    expect(trackEvent).toHaveBeenCalledWith(
      'AutoML Run Reconfigured',
      expect.objectContaining({ changedFields: '' }),
    );
  });

  it('should fire AutoML Run Stopped with source', () => {
    fireAutomlRunStopped(trackEvent, { outcome: TrackingOutcome.cancel, source: 'runsList' });

    expect(trackEvent).toHaveBeenCalledWith('AutoML Run Stopped', {
      outcome: TrackingOutcome.cancel,
      source: 'runsList',
    });
  });

  it('should fire AutoML Run Retried with the allowlisted failure category, not a raw message', () => {
    fireAutomlRunRetried(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTOML_FAILURE_CATEGORY,
    });

    expect(trackEvent).toHaveBeenCalledWith('AutoML Run Retried', {
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTOML_FAILURE_CATEGORY,
    });
  });

  it('should fire AutoML Run Deleted', () => {
    fireAutomlRunDeleted(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      source: 'runsList',
    });

    expect(trackEvent).toHaveBeenCalledWith('AutoML Run Deleted', {
      outcome: TrackingOutcome.submit,
      success: true,
      source: 'runsList',
    });
  });

  it('should fire AutoML Model Details Tab Viewed with the mapped tab name and predictionType', () => {
    fireAutomlModelDetailsTabViewed(trackEvent, 'roc-curve', 'binary');

    expect(trackEvent).toHaveBeenCalledWith('AutoML Model Details Tab Viewed', {
      tabName: 'rocCurve',
      predictionType: 'binaryClassification',
    });
  });

  it('should fire AutoML Model Details Tab Viewed with undefined predictionType when taskType is omitted', () => {
    fireAutomlModelDetailsTabViewed(trackEvent, 'model-information');

    expect(trackEvent).toHaveBeenCalledWith('AutoML Model Details Tab Viewed', {
      tabName: 'modelInformation',
      predictionType: undefined,
    });
  });

  it('should fire AutoML Backtest Window Metric Viewed with the raw metric name', () => {
    fireAutomlBacktestWindowMetricViewed(trackEvent, 'WQL');

    expect(trackEvent).toHaveBeenCalledWith('AutoML Backtest Window Metric Viewed', {
      metricName: 'WQL',
    });
  });

  it('should fire AutoML Notebook Downloaded with downloadType and source', () => {
    fireAutomlNotebookDownloaded(trackEvent, 'leaderboard');

    expect(trackEvent).toHaveBeenCalledWith('AutoML Notebook Downloaded', {
      downloadType: 'notebook',
      source: 'leaderboard',
    });
  });

  it('should fire AutoML Run Notebook Downloaded with the run notebook type', () => {
    fireAutomlRunNotebookDownloaded(trackEvent);

    expect(trackEvent).toHaveBeenCalledWith('AutoML Run Notebook Downloaded', {
      downloadType: 'runNotebook',
    });
  });

  it('should fire AutoML Model Details Download Initiated with downloadType', () => {
    fireAutomlModelDetailsDownloadInitiated(trackEvent);

    expect(trackEvent).toHaveBeenCalledWith('AutoML Model Details Download Initiated', {
      downloadType: 'modelDetails',
    });
  });

  it('should fire AutoML Model Registered with registryTarget and source', () => {
    fireAutomlModelRegistered(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      source: 'modelDetailsModal',
      registryTarget: 'my-registry',
    });

    expect(trackEvent).toHaveBeenCalledWith('AutoML Model Registered', {
      outcome: TrackingOutcome.submit,
      success: true,
      source: 'modelDetailsModal',
      registryTarget: 'my-registry',
    });
  });

  it('should fire AutoML S3 Connection Created', () => {
    fireAutomlS3ConnectionCreated(trackEvent, { outcome: TrackingOutcome.cancel });

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('AutoML S3 Connection Created', {
      outcome: TrackingOutcome.cancel,
    });
  });

  it('should fire AutoML Leaderboard Sorted with sortColumn and sortDirection', () => {
    fireAutomlLeaderboardSorted(trackEvent, 'Model name', 'desc');

    expect(trackEvent).toHaveBeenCalledWith('AutoML Leaderboard Sorted', {
      sortColumn: 'Model name',
      sortDirection: 'desc',
    });
  });

  it('should fire AutoML Flow Exited with exitType, lastFunnelStep, and exitDestination', () => {
    fireAutomlFlowExited(trackEvent, 'navigate', 'defineDetails', 'experimentsList');

    expect(trackEvent).toHaveBeenCalledWith('AutoML Flow Exited', {
      exitType: 'navigate',
      lastFunnelStep: 'defineDetails',
      exitDestination: 'experimentsList',
    });
  });

  it('should fire AutoML Flow Exited with exitType: abandon and exitDestination: none', () => {
    fireAutomlFlowExited(trackEvent, 'abandon', 'trainingData', 'none');

    expect(trackEvent).toHaveBeenCalledWith('AutoML Flow Exited', {
      exitType: 'abandon',
      lastFunnelStep: 'trainingData',
      exitDestination: 'none',
    });
  });

  it('should include changedFields when provided (reconfigure exits)', () => {
    fireAutomlFlowExited(trackEvent, 'navigate', 'configure', 'experimentsList', 'targetColumn');

    expect(trackEvent).toHaveBeenCalledWith('AutoML Flow Exited', {
      exitType: 'navigate',
      lastFunnelStep: 'configure',
      exitDestination: 'experimentsList',
      changedFields: 'targetColumn',
    });
  });

  it('should omit changedFields entirely when not provided (create-run flow exits)', () => {
    fireAutomlFlowExited(trackEvent, 'navigate', 'trainingData', 'experimentsList');

    const [, properties] = trackEvent.mock.calls[trackEvent.mock.calls.length - 1] as [
      string,
      Record<string, unknown>,
    ];
    expect(properties).not.toHaveProperty('changedFields');
  });

  it('should fire AutoML Results Viewed with the given entrySource', () => {
    fireAutomlResultsViewed(trackEvent, 'experimentsList');

    expect(trackEvent).toHaveBeenCalledWith('AutoML Results Viewed', {
      entrySource: 'experimentsList',
    });
  });

  it('should fire AutoML Model Details Viewed with the given entrySource', () => {
    fireAutomlModelDetailsViewed(trackEvent, 'pipelineViz');

    expect(trackEvent).toHaveBeenCalledWith('AutoML Model Details Viewed', {
      entrySource: 'pipelineViz',
    });
  });

  it('should default AutoML Model Details Viewed entrySource to resultsTable', () => {
    fireAutomlModelDetailsViewed(trackEvent);

    expect(trackEvent).toHaveBeenCalledWith('AutoML Model Details Viewed', {
      entrySource: 'resultsTable',
    });
  });
});

describe('isAutomlResultsNavigationState', () => {
  it.each(['experimentsList', 'notification', 'direct', 'other'] as const)(
    'should accept entrySource: %s',
    (entrySource) => {
      expect(isAutomlResultsNavigationState({ entrySource })).toBe(true);
    },
  );

  it('should reject an unknown entrySource', () => {
    expect(isAutomlResultsNavigationState({ entrySource: 'somethingElse' })).toBe(false);
  });

  it('should reject state missing entrySource', () => {
    expect(isAutomlResultsNavigationState({})).toBe(false);
  });

  it('should reject null/undefined/non-object state', () => {
    expect(isAutomlResultsNavigationState(null)).toBe(false);
    expect(isAutomlResultsNavigationState(undefined)).toBe(false);
    expect(isAutomlResultsNavigationState('experimentsList')).toBe(false);
  });
});
