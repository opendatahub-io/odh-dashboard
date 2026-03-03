package constants

// TODO: AutoRAGPipelineID and AutoRAGPipelineVersionID are hardcoded placeholders.
// These will be replaced with dynamic values fetched from the managed AutoRAG pipeline
// K8s resource once the pipeline discovery endpoint is implemented.
const (
	AutoRAGPipelineID        = "9e3940d5-b275-4b64-be10-b914cd06c58e"
	AutoRAGPipelineVersionID = "22e57c06-030f-4c63-900d-0a808d577899"

	DefaultOptimizationMetric = "faithfulness"

	MetricFaithfulness       = "faithfulness"
	MetricAnswerCorrectness  = "answer_correctness"
	MetricContextCorrectness = "context_correctness"
)

var ValidOptimizationMetrics = map[string]bool{
	MetricFaithfulness:       true,
	MetricAnswerCorrectness:  true,
	MetricContextCorrectness: true,
}
