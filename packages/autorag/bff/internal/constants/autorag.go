package constants

const (
	DefaultOptimizationMetric = "faithfulness"

	MetricFaithfulness       = "faithfulness"
	MetricAnswerCorrectness  = "answer_correctness"
	MetricContextCorrectness = "context_correctness"

	MinRagPatterns = 4
	MaxRagPatterns = 20
)

var ValidOptimizationMetrics = map[string]bool{
	MetricFaithfulness:       true,
	MetricAnswerCorrectness:  true,
	MetricContextCorrectness: true,
}
