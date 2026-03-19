package constants

const (
	DefaultOptimizationMetric = "faithfulness"

	MetricFaithfulness       = "faithfulness"
	MetricAnswerCorrectness  = "answer_correctness"
	MetricContextCorrectness = "context_correctness"

	// PipelineTypeAutoRAG identifies the AutoRAG pipeline type used during discovery and in run responses.
	PipelineTypeAutoRAG = "autorag"
)

var ValidOptimizationMetrics = map[string]bool{
	MetricFaithfulness:       true,
	MetricAnswerCorrectness:  true,
	MetricContextCorrectness: true,
}
