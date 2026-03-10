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

	TaskTypeBinary     = "binary"
	TaskTypeMulticlass = "multiclass"
	TaskTypeRegression = "regression"
)

var ValidTaskTypes = map[string]bool{
	TaskTypeBinary:     true,
	TaskTypeMulticlass: true,
	TaskTypeRegression: true,
}
