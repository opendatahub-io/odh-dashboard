package constants

const (
	DefaultOptimizationMetric = "faithfulness"
	DefaultPreset             = "speed"

	MetricFaithfulness       = "faithfulness"
	MetricAnswerCorrectness  = "answer_correctness"
	MetricContextCorrectness = "context_correctness"
	MetricOverallScore       = "overall_score"

	MinRagPatterns = 4
	MaxRagPatterns = 20

	// PipelineTypeAutoRAG identifies the AutoRAG pipeline type used during discovery and in run responses.
	PipelineTypeAutoRAG = "autorag"

	// DefaultPipelineVersionSuffix is the release version suffix appended to pipeline version names.
	// Override at runtime with the PIPELINE_VERSION_SUFFIX env var.
	DefaultPipelineVersionSuffix = "3.5.0-ea.2"
)

var ValidOptimizationMetrics = map[string]bool{
	MetricFaithfulness:       true,
	MetricAnswerCorrectness:  true,
	MetricContextCorrectness: true,
	MetricOverallScore:       true,
}

// ValidPresets lists the valid preset strings for AutoRAG pipelines.
var ValidPresets = map[string]bool{
	"speed":    true,
	"balanced": true,
}
