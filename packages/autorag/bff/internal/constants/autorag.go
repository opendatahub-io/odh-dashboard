package constants

const (
	MetricUnitxtFaithfulness      = "unitxt:faithfulness"
	MetricUnitxtAnswerCorrectness = "unitxt:answer_correctness"
	MetricCustomOverallScore      = "custom:overall_score"
	MetricRagasFaithfulness       = "ragas:faithfulness"
	MetricRagasAnswerRelevancy    = "ragas:answer_relevancy"
	MetricRagasContextPrecision   = "ragas:context_precision"
	MetricRagasContextRecall      = "ragas:context_recall"
	LegacyMetricFaithfulness      = "faithfulness"
	LegacyMetricAnswerCorrectness = "answer_correctness"
	LegacyMetricOverallScore      = "overall_score"

	DefaultOptimizationMetric = MetricCustomOverallScore
	DefaultPreset             = "speed"

	MinRagPatterns        = 4
	MaxRagPatterns        = 10
	DefaultMaxRagPatterns = 5

	// PipelineTypeAutoRAG identifies the AutoRAG pipeline type used during discovery and in run responses.
	PipelineTypeAutoRAG = "autorag"

	// PipelineTypeIndexing identifies the documents-indexing-pipeline type used during discovery and in run responses.
	PipelineTypeIndexing = "indexing"
)

var ValidOptimizationMetrics = map[string]bool{
	MetricUnitxtFaithfulness:      true,
	MetricUnitxtAnswerCorrectness: true,
	MetricCustomOverallScore:      true,
	MetricRagasFaithfulness:       true,
	MetricRagasAnswerRelevancy:    true,
	MetricRagasContextPrecision:   true,
	MetricRagasContextRecall:      true,
	LegacyMetricFaithfulness:      true,
}

var ValidOptimizationMetricsByPreset = map[string]map[string]bool{
	"speed": {
		MetricUnitxtFaithfulness: true, MetricUnitxtAnswerCorrectness: true, MetricCustomOverallScore: true,
	},
	"balanced": {
		MetricUnitxtFaithfulness: true, MetricUnitxtAnswerCorrectness: true, MetricCustomOverallScore: true,
		MetricRagasFaithfulness: true, MetricRagasAnswerRelevancy: true, MetricRagasContextPrecision: true,
		MetricRagasContextRecall: true,
	},
}

func NormalizeOptimizationMetric(metric, preset string) string {
	if metric == "" {
		return DefaultOptimizationMetric
	}
	if metric == LegacyMetricFaithfulness {
		if preset == "balanced" {
			return MetricRagasFaithfulness
		}
		return MetricUnitxtFaithfulness
	}
	return metric
}

// ValidPresets lists the valid preset strings for AutoRAG pipelines.
var ValidPresets = map[string]bool{
	"speed":    true,
	"balanced": true,
}
