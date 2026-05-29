package constants

const (
	DefaultOptimizationMetric = "faithfulness"

	MetricFaithfulness       = "faithfulness"
	MetricAnswerCorrectness  = "answer_correctness"
	MetricContextCorrectness = "context_correctness"

	MinRagPatterns = 4
	MaxRagPatterns = 20

	// PipelineTypeAutoRAG identifies the AutoRAG pipeline type used during discovery and in run responses.
	PipelineTypeAutoRAG = "autorag"

	// DefaultPipelineVersionSuffix is the release version suffix appended to pipeline version names.
	// Override at runtime with the PIPELINE_VERSION_SUFFIX env var.
	DefaultPipelineVersionSuffix = "3.5.0-ea.1"
)

var ValidOptimizationMetrics = map[string]bool{
	MetricFaithfulness:       true,
	MetricAnswerCorrectness:  true,
	MetricContextCorrectness: true,
}
