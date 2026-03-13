package constants

// TODO: AutoMLPipelineID and AutoMLPipelineVersionID are hardcoded placeholders.
// These will be replaced with dynamic values fetched from the managed AutoML pipeline
// K8s resource once the pipeline discovery endpoint is implemented.
const (
	AutoMLPipelineID        = "9e3940d5-b275-4b64-be10-b914cd06c58e"
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
