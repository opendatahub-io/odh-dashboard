package constants

// AutoMLPipelineID and AutoMLPipelineVersionID are now dynamically discovered
// using the pipeline discovery repository. The discovery middleware
// (AttachDiscoveredPipeline) finds the managed AutoML pipeline by name prefix.
// These constants are kept for backwards compatibility but should not be used directly.
// Use the DiscoveredPipeline from context instead.
const (
	// Deprecated: Use pipeline discovery instead
	AutoMLPipelineID = "9e3940d5-b275-4b64-be10-b914cd06c58e"
	// Deprecated: Use pipeline discovery instead
	AutoMLPipelineVersionID = "22e57c06-030f-4c63-900d-0a808d577899"

	DefaultTopN = 3
	MinTopN     = 1

	// Maximum top_n values based on pipeline type
	MaxTopNTabular    = 10
	MaxTopNTimeSeries = 7

	TaskTypeBinary     = "binary"
	TaskTypeMulticlass = "multiclass"
	TaskTypeRegression = "regression"

	// PipelineTypeTimeSeries identifies the AutoML time-series pipeline during discovery.
	PipelineTypeTimeSeries = "timeseries"
	// PipelineTypeTabular identifies the AutoML tabular pipeline (classification + regression) during discovery.
	PipelineTypeTabular = "tabular"

	// DefaultPipelineVersionSuffix is the release version suffix appended to pipeline version names.
	// Override at runtime with the PIPELINE_VERSION_SUFFIX env var.
	DefaultPipelineVersionSuffix = "3.5.0-ea.2"
)

var ValidTaskTypes = map[string]bool{
	TaskTypeBinary:     true,
	TaskTypeMulticlass: true,
	TaskTypeRegression: true,
}

// ValidTabularPresets lists the valid preset strings for tabular pipelines.
var ValidTabularPresets = map[string]bool{
	"speed":    true,
	"balanced": true,
}

// ValidTimeseriesPresets lists the valid preset strings for timeseries pipelines.
var ValidTimeseriesPresets = map[string]bool{
	"speed":    true,
	"balanced": true,
}

// ValidBinaryEvalMetrics lists valid eval_metric values for binary classification.
var ValidBinaryEvalMetrics = map[string]bool{
	"accuracy": true, "balanced_accuracy": true, "log_loss": true,
	"f1": true, "f1_macro": true, "f1_micro": true, "f1_weighted": true,
	"roc_auc": true, "average_precision": true,
	"precision": true, "precision_macro": true, "precision_micro": true, "precision_weighted": true,
	"recall": true, "recall_macro": true, "recall_micro": true, "recall_weighted": true,
	"mcc": true, "pac_score": true,
}

// ValidMulticlassEvalMetrics lists valid eval_metric values for multiclass classification.
var ValidMulticlassEvalMetrics = map[string]bool{
	"accuracy": true, "balanced_accuracy": true, "log_loss": true,
	"f1_macro": true, "f1_micro": true, "f1_weighted": true,
	"roc_auc_ovo": true, "roc_auc_ovo_weighted": true,
	"roc_auc_ovr": true, "roc_auc_ovr_micro": true, "roc_auc_ovr_weighted": true,
	"precision_macro": true, "precision_micro": true, "precision_weighted": true,
	"recall_macro": true, "recall_micro": true, "recall_weighted": true,
	"mcc": true, "pac_score": true,
}

// ValidRegressionEvalMetrics lists valid eval_metric values for regression tasks.
var ValidRegressionEvalMetrics = map[string]bool{
	"root_mean_squared_error":                  true,
	"mean_squared_error":                       true,
	"mean_absolute_error":                      true,
	"median_absolute_error":                    true,
	"mean_absolute_percentage_error":           true,
	"r2":                                       true,
	"symmetric_mean_absolute_percentage_error": true,
}

// ValidTimeseriesEvalMetrics lists valid eval_metric values for timeseries tasks (UPPERCASE).
var ValidTimeseriesEvalMetrics = map[string]bool{
	"SQL": true, "WQL": true, "MAE": true, "MAPE": true, "MASE": true,
	"MSE": true, "RMSE": true, "RMSLE": true, "RMSSE": true, "SMAPE": true, "WAPE": true,
}

// ValidPipelineTypes lists the valid pipeline type keys for AutoML discovery.
var ValidPipelineTypes = map[string]bool{
	PipelineTypeTimeSeries: true,
	PipelineTypeTabular:    true,
}
