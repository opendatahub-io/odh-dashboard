package ehmocks

import (
	"context"
	"strings"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
)

// MockEvalHubClient provides canned responses for development and testing.
type MockEvalHubClient struct{}

func NewMockEvalHubClient() *MockEvalHubClient {
	return &MockEvalHubClient{}
}

func (m *MockEvalHubClient) HealthCheck(_ context.Context) (*evalhub.HealthResponse, error) {
	return &evalhub.HealthResponse{Status: "healthy"}, nil
}

// ListCollections returns mock benchmark collections with optional in-memory filtering and pagination.
func (m *MockEvalHubClient) ListCollections(_ context.Context, params evalhub.ListCollectionsParams) (evalhub.CollectionsResponse, error) {
	all := mockCollections()

	// Apply filters
	filtered := make([]evalhub.Collection, 0, len(all))
	for _, c := range all {
		if params.Name != "" && !containsCI(c.Name, params.Name) {
			continue
		}
		if params.Category != "" && !strings.EqualFold(c.Category, params.Category) {
			continue
		}
		filtered = append(filtered, c)
	}

	total := len(filtered)

	// Apply pagination
	offset := params.Offset
	if offset > total {
		offset = total
	}
	limit := params.Limit
	if limit <= 0 {
		limit = 50
	}
	end := offset + limit
	if end > total {
		end = total
	}

	return evalhub.CollectionsResponse{
		TotalCount: total,
		Limit:      limit,
		Items:      filtered[offset:end],
	}, nil
}

func containsCI(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

// ListProviders returns all mock evaluation providers with their benchmark catalogues.
func (m *MockEvalHubClient) ListProviders(_ context.Context, _ string, _, _ int) (evalhub.ProvidersResponse, error) {
	providers := mockProviders()
	return evalhub.ProvidersResponse{Items: providers, TotalCount: countBenchmarks(providers)}, nil
}

func countBenchmarks(providers []evalhub.Provider) int {
	total := 0
	for _, p := range providers {
		total += len(p.Benchmarks)
	}
	return total
}

// mockProviders returns the full provider catalogue used by all mock responses.
func mockProviders() []evalhub.Provider {
	return []evalhub.Provider{
		{
			Resource: evalhub.ProviderResource{ID: "lm_evaluation_harness"},
			Name:     "lm_evaluation_harness",
			Title:    "LM Evaluation Harness",
			Description: "EleutherAI's LM Evaluation Harness – a unified framework for testing " +
				"generative language models on a large number of different evaluation tasks.",
			Tags: []string{"Open Source", "Standard"},
			Benchmarks: []evalhub.ProviderBenchmark{
				{
					ID:   "truthfulqa_mc1",
					Name: "Truthfulness Testing",
					Description: "TruthfulQA tests whether models give truthful answers to questions where humans often answer incorrectly due to misconceptions or false beliefs. " +
						"It is essential for identifying models that hallucinate confidently incorrect answers in high-stakes applications.",
					Category:    "Safety",
					Metrics:     []string{"Instruction adherence", "Format compliance", "Common sense reasoning", "Factual accuracy", "Hallucination rate", "Calibration"},
					NumFewShot:  0,
					DatasetSize: 817,
				},
				{
					ID:   "crows_pairs",
					Name: "Stereotype Bias",
					Description: "CrowS-Pairs measures stereotypical biases across 9 categories including race, gender, religion, age, and socioeconomic status. " +
						"It uses minimal sentence pairs to identify whether models assign higher likelihood to stereotypical statements.",
					Category:    "Safety",
					Metrics:     []string{"Instruction adherence", "Format compliance", "Common sense reasoning", "Bias score", "Fairness"},
					NumFewShot:  0,
					DatasetSize: 1508,
				},
				{
					ID:   "hellaswag",
					Name: "Common sense Reasoning",
					Description: "HellaSwag tests commonsense reasoning using adversarial filtering, where models choose the most likely continuation of an activity from four plausible-sounding options. " +
						"It reveals whether models understand everyday physical situations and can reason about likely next steps.",
					Category:    "Quality",
					Metrics:     []string{"Instruction adherence", "Format compliance", "Common sense reasoning", "Logical consistency", "Physical reasoning", "Temporal understanding"},
					NumFewShot:  10,
					DatasetSize: 10042,
				},
				{
					ID:   "winogrande",
					Name: "Pronoun Resolution",
					Description: "WinoGrande is a large-scale adversarial Winograd schema challenge that tests commonsense reasoning through pronoun resolution problems. " +
						"It measures the world knowledge and common sense required to correctly resolve pronoun references in ambiguous sentences.",
					Category:    "Quality",
					Metrics:     []string{"Instruction adherence", "Format compliance", "Common sense reasoning", "Coreference resolution", "Linguistic reasoning"},
					NumFewShot:  5,
					DatasetSize: 1267,
				},
				{
					ID:   "teleqna",
					Name: "Telco Knowledge",
					Description: "TeleQnA evaluates LLMs on telecommunications domain knowledge covering network protocols, standards, and industry terminology. " +
						"It assesses whether models can accurately answer domain-specific telecom questions including 5G/6G specs, network architecture, and regulatory frameworks.",
					Category:    "Quality",
					Metrics:     []string{"Instruction adherence", "Format compliance", "Common sense reasoning", "Domain accuracy", "Technical precision", "Recall"},
					NumFewShot:  3,
					DatasetSize: 10000,
				},
				{
					ID:   "bbh",
					Name: "Complex Reasoning",
					Description: "BIG-Bench Hard (BBH) focuses on 23 tasks where language models previously could not outperform average human performance, requiring multi-step reasoning and algorithmic thinking. " +
						"Tasks include logical deduction, causal reasoning, tracking shuffled objects, and temporal sequences.",
					Category:    "Capability",
					Metrics:     []string{"Instruction adherence", "Format compliance", "Common sense reasoning", "Algorithmic tasks", "Multi-step reasoning", "Logical deduction"},
					NumFewShot:  3,
					DatasetSize: 6511,
				},
				{
					ID:   "ifeval",
					Name: "Instruction Following",
					Description: "IFEval tests whether language models can precisely follow explicit formatting instructions like 'write exactly 3 paragraphs' or 'include keyword x twice.' " +
						"It covers keyword constraints, length requirements, format specifications, and combinatorial instructions critical for real-world structured output tasks.",
					Category:    "Capability",
					Metrics:     []string{"Instruction adherence", "Common sense reasoning", "Algorithmic tasks", "Format compliance", "World knowledge"},
					NumFewShot:  0,
					DatasetSize: 541,
				},
				{
					ID:   "gsm8k",
					Name: "Math Reasoning",
					Description: "GSM8K consists of 8,500 high-quality grade school math word problems that require 2 to 8 steps to solve using basic arithmetic operations. " +
						"It tests systematic multi-step mathematical reasoning expressed in natural language rather than simple computation.",
					Category:    "Capability",
					Metrics:     []string{"Instruction adherence", "Algorithmic tasks", "Format compliance", "Numerical accuracy", "Step-by-step reasoning"},
					NumFewShot:  5,
					DatasetSize: 1319,
				},
				{
					ID:   "mmlu",
					Name: "Language Understanding",
					Description: "MMLU measures language model knowledge across 57 subjects including STEM, humanities, and social sciences with 15,908 questions. " +
						"It covers a wide range of difficulty levels, making it one of the most comprehensive benchmarks for general-purpose LLMs.",
					Category:    "Capability",
					Metrics:     []string{"World knowledge", "Instruction adherence", "Format compliance", "Factual accuracy", "Domain breadth"},
					NumFewShot:  5,
					DatasetSize: 14042,
				},
				{
					ID:   "humaneval",
					Name: "Code Generation",
					Description: "HumanEval measures functional correctness for synthesizing programs from docstrings using 164 handwritten programming problems. " +
						"Models are evaluated by generating code completions and running unit tests, providing a practical measure of working code generation from natural language.",
					Category:    "Capability",
					Metrics:     []string{"Instruction adherence", "Algorithmic tasks", "Format compliance", "Pass@1", "Pass@10", "Code correctness"},
					NumFewShot:  0,
					DatasetSize: 164,
				},
				{
					ID:   "triviaqa",
					Name: "Factual Knowledge",
					Description: "TriviaQA is a reading comprehension dataset with over 650K question-answer-evidence triples authored by trivia enthusiasts. " +
						"It tests models on recalling factual information and synthesizing answers from provided evidence passages.",
					Category:    "Quality",
					Metrics:     []string{"World knowledge", "Instruction adherence", "Format compliance", "Exact match", "F1 score"},
					NumFewShot:  5,
					DatasetSize: 17944,
				},
				{
					ID:   "commonsenseqa",
					Name: "Commonsense QA",
					Description: "CommonsenseQA is a multiple-choice QA dataset built from ConceptNet relationships that requires commonsense knowledge to predict correct answers. " +
						"It challenges models on background knowledge implicit in everyday language and not directly stated in any passage.",
					Category:    "Quality",
					Metrics:     []string{"Common sense reasoning", "World knowledge", "Instruction adherence", "Format compliance"},
					NumFewShot:  7,
					DatasetSize: 1221,
				},
			},
		},
		{
			Resource: evalhub.ProviderResource{ID: "safety_eval_suite"},
			Name:     "safety_eval_suite",
			Title:    "Safety Evaluation Suite",
			Description: "Comprehensive safety evaluation suite for identifying harmful, biased, " +
				"and unreliable model behaviours in production environments.",
			Tags: []string{"Safety", "Red Teaming"},
			Benchmarks: []evalhub.ProviderBenchmark{
				{
					ID:   "toxigen",
					Name: "Toxicity Detection",
					Description: "ToxiGen is a large-scale machine-generated dataset of toxic and benign statements about 13 minority groups, designed to measure implicit hate speech difficult to detect with traditional classifiers. " +
						"It measures whether models generate, amplify, or detect toxic content targeted at specific demographic groups.",
					Category:    "Safety",
					Metrics:     []string{"Toxicity score", "Hate speech detection", "Implicit bias", "Instruction adherence"},
					NumFewShot:  0,
					DatasetSize: 274186,
				},
				{
					ID:   "winobias",
					Name: "Gender Bias Detection",
					Description: "WinoBias measures gender bias in coreference resolution by testing whether models make stereotypical associations between professions and genders. " +
						"It uses pro- and anti-stereotypical examples to expose and quantify systematic gender bias across model iterations.",
					Category:    "Safety",
					Metrics:     []string{"Gender bias score", "Coreference accuracy", "Fairness", "Instruction adherence"},
					NumFewShot:  0,
					DatasetSize: 3160,
				},
				{
					ID:   "harmbench",
					Name: "Jailbreak Resistance",
					Description: "HarmBench is a standardised framework for automated red-teaming that provides adversarial prompts designed to elicit harmful outputs across multiple harm categories. " +
						"It enables systematic measurement of a model's robustness against jailbreaking attempts and harmful instruction following.",
					Category:    "Safety",
					Metrics:     []string{"Jailbreak success rate", "Refusal rate", "Instruction adherence", "Harm score"},
					NumFewShot:  0,
					DatasetSize: 510,
				},
				{
					ID:   "bbq",
					Name: "Social Bias QA",
					Description: "BBQ is a context-sensitive QA dataset highlighting social biases against protected classes spanning age, gender, race, religion, and sexual orientation. " +
						"It tests whether models exhibit or amplify social biases when answering questions about individuals from different demographic groups.",
					Category:    "Safety",
					Metrics:     []string{"Bias score", "Ambiguity handling", "Instruction adherence", "Format compliance"},
					NumFewShot:  0,
					DatasetSize: 58492,
				},
				{
					ID:   "privacy_understanding",
					Name: "Privacy Awareness",
					Description: "Privacy Understanding evaluates whether models appropriately handle private information and resist requests to recall or generate sensitive personal data from context or training. " +
						"It covers PII detection, contextual integrity violations, and behaviour under privacy-preserving prompting strategies.",
					Category:    "Safety",
					Metrics:     []string{"PII detection", "Privacy compliance", "Information leakage", "Instruction adherence"},
					NumFewShot:  0,
					DatasetSize: 1732,
				},
				{
					ID:   "med_safety",
					Name: "Medical Safety",
					Description: "MedSafetyBench evaluates whether language models provide safe and responsible medical advice when users ask for diagnoses, treatments, or drug interactions. " +
						"It measures whether models appropriately defer to medical professionals and avoid providing dangerous guidance.",
					Category:    "Quality",
					Metrics:     []string{"Medical accuracy", "Safety compliance", "Instruction adherence", "Harm avoidance", "Referral appropriateness"},
					NumFewShot:  0,
					DatasetSize: 5000,
				},
				{
					ID:   "cybersec_eval",
					Name: "Cybersecurity Evaluation",
					Description: "CyberSecEval evaluates the cybersecurity risks and capabilities of LLMs, measuring both their ability to assist with legitimate security tasks and potential for misuse. " +
						"It includes code security analysis, vulnerability explanation, and adversarial cybersecurity instruction following tasks.",
					Category:    "Capability",
					Metrics:     []string{"Security knowledge", "Vulnerability detection", "Instruction adherence", "Harm avoidance", "Code safety"},
					NumFewShot:  0,
					DatasetSize: 4000,
				},
				{
					ID:   "scientific_reasoning",
					Name: "Scientific Reasoning",
					Description: "SciQ is a crowdsourced science question dataset testing scientific reasoning across physics, chemistry, biology, and earth science via multiple-choice questions. " +
						"Questions span elementary through high school curricula, making it a broad measure of scientific literacy in language models.",
					Category:    "Quality",
					Metrics:     []string{"Scientific accuracy", "Common sense reasoning", "World knowledge", "Instruction adherence"},
					NumFewShot:  0,
					DatasetSize: 1000,
				},
			},
		},
	}
}

func (m *MockEvalHubClient) GetEvaluationJob(_ context.Context, id string, _ string) (*evalhub.EvaluationJob, error) {
	jobs, _ := m.ListEvaluationJobs(context.Background(), evalhub.ListEvaluationJobsParams{})
	for i := range jobs {
		if jobs[i].Resource.ID == id {
			return &jobs[i], nil
		}
	}
	return nil, nil
}

func ptr(f float64) *float64 { return &f }

func (m *MockEvalHubClient) CreateEvaluationJob(_ context.Context, _ string, req evalhub.CreateEvaluationJobRequest) (*evalhub.EvaluationJob, error) {
	benchmarks := req.Benchmarks
	if benchmarks == nil {
		benchmarks = []evalhub.JobBenchmark{}
	}

	return &evalhub.EvaluationJob{
		Resource: evalhub.JobResource{
			ID:        "eval-job-mock-new",
			CreatedAt: "2026-03-09T12:00:00Z",
			UpdatedAt: "2026-03-09T12:00:00Z",
		},
		Status:      evalhub.JobStatus{State: "pending"},
		Name:        req.Name,
		Description: req.Description,
		Tags:        req.Tags,
		Model:       req.Model,
		Benchmarks:  benchmarks,
	}, nil
}

func (m *MockEvalHubClient) CancelEvaluationJob(_ context.Context, _ string, _ string, _ bool) error {
	return nil
}

func (m *MockEvalHubClient) ListEvaluationJobs(_ context.Context, _ evalhub.ListEvaluationJobsParams) ([]evalhub.EvaluationJob, error) {
	pass := true
	fail := false

	return []evalhub.EvaluationJob{
		{
			Resource: evalhub.JobResource{
				ID:        "eval-job-001",
				Tenant:    "GPT-4 Safety Assessment",
				CreatedAt: "2026-03-01T09:00:00Z",
				UpdatedAt: "2026-03-01T09:00:00Z",
			},
			Name:   "GPT-4 Safety Assessment",
			Status: evalhub.JobStatus{State: "running"},
			Model:  evalhub.JobModel{Name: "gpt-4-turbo"},
			Benchmarks: []evalhub.JobBenchmark{
				{ID: "toxigen", ProviderID: "safety_eval_suite"},
			},
		},
		{
			Resource: evalhub.JobResource{
				ID:        "eval-job-002",
				Tenant:    "Healthcare Compliance Suite",
				CreatedAt: "2026-02-28T14:00:00Z",
				UpdatedAt: "2026-02-28T14:00:00Z",
			},
			Name:   "Healthcare Compliance Suite",
			Status: evalhub.JobStatus{State: "stopping"},
			Model:  evalhub.JobModel{Name: "llama-3-70b"},
			Benchmarks: []evalhub.JobBenchmark{
				{ID: "med_safety", ProviderID: "safety_eval_suite"},
			},
		},
		{
			Resource: evalhub.JobResource{
				ID:        "eval-job-003",
				Tenant:    "MMLU Comprehensive",
				CreatedAt: "2026-02-25T11:00:00Z",
				UpdatedAt: "2026-02-25T11:30:00Z",
			},
			Name:   "MMLU Comprehensive",
			Status: evalhub.JobStatus{State: "failed"},
			Model:  evalhub.JobModel{Name: "claude-3-opus"},
			Benchmarks: []evalhub.JobBenchmark{
				{ID: "mmlu", ProviderID: "lm_evaluation_harness"},
			},
		},
		// Single benchmark – completed (result: fail)
		{
			Resource: evalhub.JobResource{
				ID:        "eval-job-004",
				CreatedAt: "2026-03-05T10:20:00Z",
				UpdatedAt: "2026-03-05T11:30:00Z",
				Owner:     "user@example.com",
			},
			Name:   "ToxicityDetect_Eval_Claude",
			Tags:   []string{"Safety"},
			Status: evalhub.JobStatus{State: "completed"},
			Results: evalhub.JobResults{
				TotalEvaluations: 1,
				Benchmarks: []evalhub.BenchmarkResult{
					{
						ID:         "harmful_request_refusal",
						ProviderID: "safety_eval_suite",
						Metrics:    map[string]float64{"refusal_rate": 0.30},
						Test:       &evalhub.BenchmarkResultTest{PrimaryScore: ptr(0.30), Threshold: ptr(0.5), Pass: &fail},
					},
				},
				Test: &evalhub.ResultTest{
					Score:     ptr(0.30),
					Threshold: ptr(0.5),
					Pass:      &fail,
				},
			},
			Model: evalhub.JobModel{
				Name: "claude-3-opus",
				URL:  "https://api.example.com/v1/models/serving-endpoint01",
			},
			PassCriteria: &evalhub.JobPassCriteria{Threshold: 0.5},
			Benchmarks: []evalhub.JobBenchmark{
				{ID: "harmful_request_refusal", ProviderID: "safety_eval_suite", PrimaryScore: &evalhub.JobPrimaryScore{Metric: "asr_score_subset", LowerIsBetter: false}},
			},
		},
		{
			Resource: evalhub.JobResource{
				ID:        "eval-job-005",
				Tenant:    "Telco Compliance Assessment",
				CreatedAt: "2026-02-20T08:00:00Z",
				UpdatedAt: "2026-02-20T08:00:00Z",
			},
			Name:   "Telco Compliance Assessment",
			Status: evalhub.JobStatus{State: "stopped"},
			Model:  evalhub.JobModel{Name: "claude-3-opus"},
			Benchmarks: []evalhub.JobBenchmark{
				{ID: "teleqna", ProviderID: "lm_evaluation_harness"},
			},
		},
		// Collection – completed
		{
			Resource: evalhub.JobResource{
				ID:        "eval-job-006",
				CreatedAt: "2026-03-10T14:30:00Z",
				UpdatedAt: "2026-03-10T15:45:00Z",
				Owner:     "user@example.com",
			},
			Name:   "ToxicityDet_Claude",
			Tags:   []string{"Safety"},
			Status: evalhub.JobStatus{State: "completed"},
			Results: evalhub.JobResults{
				TotalEvaluations: 8,
				Benchmarks: []evalhub.BenchmarkResult{
					{ID: "harmful_request_refusal", ProviderID: "safety_eval_suite", Metrics: map[string]float64{"refusal_rate": 0.95, "false_positive_rate": 0.02}, Test: &evalhub.BenchmarkResultTest{PrimaryScore: ptr(0.95), Threshold: ptr(0.8), Pass: &pass}},
					{ID: "truthfulqa_mc1", ProviderID: "lm_evaluation_harness", Metrics: map[string]float64{"accuracy": 0.68, "calibration": 0.72}, Test: &evalhub.BenchmarkResultTest{PrimaryScore: ptr(0.68), Threshold: ptr(0.5), Pass: &pass}},
					{ID: "toxigen", ProviderID: "safety_eval_suite", Metrics: map[string]float64{"toxicity_score": 0.12, "false_negative_rate": 0.08}, Test: &evalhub.BenchmarkResultTest{PrimaryScore: ptr(0.88), Threshold: ptr(0.7), Pass: &pass}},
					{ID: "toxicity_risk", ProviderID: "safety_eval_suite", Metrics: map[string]float64{"risk_score": 0.45}, Test: &evalhub.BenchmarkResultTest{PrimaryScore: ptr(0.55), Threshold: ptr(0.6), Pass: &fail}},
					{ID: "ethical_alignment", ProviderID: "safety_eval_suite", Metrics: map[string]float64{"alignment_score": 0.81}, Test: &evalhub.BenchmarkResultTest{PrimaryScore: ptr(0.81), Threshold: ptr(0.7), Pass: &pass}},
					{ID: "winobias", ProviderID: "safety_eval_suite", Metrics: map[string]float64{"bias_score": 0.73}, Test: &evalhub.BenchmarkResultTest{PrimaryScore: ptr(0.73), Threshold: ptr(0.8), Pass: &fail}},
					{ID: "adversarial_robustness", ProviderID: "safety_eval_suite", Metrics: map[string]float64{"robustness": 0.62}, Test: &evalhub.BenchmarkResultTest{PrimaryScore: ptr(0.62), Threshold: ptr(0.5), Pass: &pass}},
					{ID: "truthfulqa_gen", ProviderID: "lm_evaluation_harness", Metrics: map[string]float64{"truthfulness": 0.59}, Test: &evalhub.BenchmarkResultTest{PrimaryScore: ptr(0.59), Threshold: ptr(0.5), Pass: &pass}},
				},
				Test: &evalhub.ResultTest{Score: ptr(0.72), Threshold: ptr(0.3), Pass: &pass},
			},
			Model: evalhub.JobModel{
				Name: "claude-3-opus",
				URL:  "https://api.example.com/v1/models/serving-endpoint01",
			},
			PassCriteria: &evalhub.JobPassCriteria{Threshold: 0.3},
			Benchmarks: []evalhub.JobBenchmark{
				{ID: "harmful_request_refusal", ProviderID: "safety_eval_suite", PrimaryScore: &evalhub.JobPrimaryScore{Metric: "asr_score_subset", LowerIsBetter: false}},
				{ID: "truthfulqa_mc1", ProviderID: "lm_evaluation_harness", PrimaryScore: &evalhub.JobPrimaryScore{Metric: "accuracy", LowerIsBetter: false}},
				{ID: "toxigen", ProviderID: "safety_eval_suite", PrimaryScore: &evalhub.JobPrimaryScore{Metric: "toxicity_score", LowerIsBetter: true}},
				{ID: "toxicity_risk", ProviderID: "safety_eval_suite", PrimaryScore: &evalhub.JobPrimaryScore{Metric: "risk_score", LowerIsBetter: true}},
				{ID: "ethical_alignment", ProviderID: "safety_eval_suite", PrimaryScore: &evalhub.JobPrimaryScore{Metric: "alignment_score", LowerIsBetter: false}},
				{ID: "winobias", ProviderID: "safety_eval_suite", PrimaryScore: &evalhub.JobPrimaryScore{Metric: "bias_score", LowerIsBetter: true}},
				{ID: "adversarial_robustness", ProviderID: "safety_eval_suite", PrimaryScore: &evalhub.JobPrimaryScore{Metric: "robustness", LowerIsBetter: false}},
				{ID: "truthfulqa_gen", ProviderID: "lm_evaluation_harness", PrimaryScore: &evalhub.JobPrimaryScore{Metric: "truthfulness", LowerIsBetter: false}},
			},
			Collection: &evalhub.JobCollectionID{ID: "collection-002"},
		},
	}, nil
}

// mockCollections returns the full catalogue used by all mock responses.
func mockCollections() []evalhub.Collection {
	return []evalhub.Collection{
		{
			Resource:    evalhub.CollectionResource{ID: "collection-001"},
			Name:        "Open LLM Leaderboard v2",
			Category:    "General",
			Description: "Comprehensive evaluation suite for general-purpose language models.",
			Tags:        []string{"Comprehensive", "Industry Standard"},
			Benchmarks: []evalhub.CollectionBenchmark{
				{ID: "arc_challenge", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "hellaswag", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "mmlu", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "truthfulqa", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "winogrande", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "gsm8k", ProviderID: "lm_evaluation_harness", Weight: 1},
			},
		},
		{
			Resource:    evalhub.CollectionResource{ID: "collection-002"},
			Name:        "Safety and Fairness",
			Category:    "Safety",
			Description: "Evaluates model safety, bias, and fairness across diverse scenarios.",
			Tags:        []string{"Bias", "Fairness"},
			Benchmarks: []evalhub.CollectionBenchmark{
				{ID: "bbq", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "bold", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "winobias", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "toxigen", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "crows_pairs", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "stereoset", ProviderID: "lm_evaluation_harness", Weight: 1},
			},
		},
		{
			Resource:    evalhub.CollectionResource{ID: "collection-003"},
			Name:        "Open-Telco LLM Benchmark",
			Category:    "Telco",
			Description: "Specialized benchmarks for telecommunications industry applications.",
			Tags:        []string{"Industry", "Domain-specific"},
			Benchmarks: []evalhub.CollectionBenchmark{
				{ID: "telco_qa", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "network_config", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "telecom_ner", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "fault_diagnosis", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "telco_summarization", ProviderID: "lm_evaluation_harness", Weight: 1},
			},
		},
		{
			Resource:    evalhub.CollectionResource{ID: "collection-004"},
			Name:        "Healthcare Evaluation v5",
			Category:    "Healthcare",
			Description: "Medical and healthcare domain-specific evaluation suite.",
			Tags:        []string{"Medical", "Domain-specific"},
			Benchmarks: []evalhub.CollectionBenchmark{
				{ID: "medqa", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "medmcqa", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "pubmedqa", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "clinical_ner", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "icd_coding", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "radiology_vqa", ProviderID: "lm_evaluation_harness", Weight: 1},
			},
		},
		{
			Resource:    evalhub.CollectionResource{ID: "collection-005"},
			Name:        "Finance Evaluation v3",
			Category:    "Finance",
			Description: "Financial services and banking domain evaluation suite.",
			Tags:        []string{"Banking", "Domain-specific"},
			Benchmarks: []evalhub.CollectionBenchmark{
				{ID: "finqa", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "convfinqa", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "finbench", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "flue", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "fomc", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "fpb", ProviderID: "lm_evaluation_harness", Weight: 1},
			},
		},
		{
			Resource:    evalhub.CollectionResource{ID: "collection-006"},
			Name:        "Software Development v1",
			Category:    "Code",
			Description: "Code generation, debugging, and software development tasks.",
			Tags:        []string{"Software", "Engineering"},
			Benchmarks: []evalhub.CollectionBenchmark{
				{ID: "humaneval", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "mbpp", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "ds1000", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "swebench", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "codecontests", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "apps", ProviderID: "lm_evaluation_harness", Weight: 1},
			},
		},
	}
}
