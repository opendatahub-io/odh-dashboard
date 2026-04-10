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
)

var ValidTaskTypes = map[string]bool{
	TaskTypeBinary:     true,
	TaskTypeMulticlass: true,
	TaskTypeRegression: true,
}

// ValidPipelineTypes lists the valid pipeline type keys for AutoML discovery.
var ValidPipelineTypes = map[string]bool{
	PipelineTypeTimeSeries: true,
	PipelineTypeTabular:    true,
}
