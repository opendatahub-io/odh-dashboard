package kubernetes

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/types"
	"gopkg.in/yaml.v2"
)

// LlamaStackConfig represents the main configuration structure
type LlamaStackConfig struct {
	Version       string        `json:"version" yaml:"version"`
	ImageName     string        `json:"image_name" yaml:"image_name"`
	APIs          []string      `json:"apis" yaml:"apis"`
	Providers     Providers     `json:"providers" yaml:"providers"`
	MetadataStore MetadataStore `json:"metadata_store" yaml:"metadata_store"`
	Storage       Storage       `json:"storage" yaml:"storage"`
	Models        []Model       `json:"models" yaml:"models"`
	Shields       []Shield      `json:"shields" yaml:"shields"`
	VectorDBs     []VectorDB    `json:"vector_dbs" yaml:"vector_dbs"`
	Datasets      []Dataset     `json:"datasets" yaml:"datasets"`
	ScoringFns    []ScoringFn   `json:"scoring_fns" yaml:"scoring_fns"`
	Benchmarks    []Benchmark   `json:"benchmarks" yaml:"benchmarks"`
	ToolGroups    []ToolGroup   `json:"tool_groups" yaml:"tool_groups"`
	Server        Server        `json:"server" yaml:"server"`
}

type Providers struct {
	Inference   []Provider `json:"inference" yaml:"inference"`
	VectorIO    []Provider `json:"vector_io" yaml:"vector_io"`
	Agents      []Provider `json:"agents" yaml:"agents"`
	Eval        []Provider `json:"eval" yaml:"eval"`
	Files       []Provider `json:"files" yaml:"files"`
	DatasetIO   []Provider `json:"datasetio" yaml:"datasetio"`
	Scoring     []Provider `json:"scoring" yaml:"scoring"`
	ToolRuntime []Provider `json:"tool_runtime" yaml:"tool_runtime"`
}

type Provider struct {
	ProviderID   string                 `json:"provider_id" yaml:"provider_id"`
	ProviderType string                 `json:"provider_type" yaml:"provider_type"`
	Config       map[string]interface{} `json:"config" yaml:"config"`
}

type MetadataStore struct {
	Type   string `json:"type" yaml:"type"`
	DBPath string `json:"db_path" yaml:"db_path"`
}

type Storage struct {
	Backends map[string]interface{} `json:"backends" yaml:"backends"`
	Stores   map[string]interface{} `json:"stores" yaml:"stores"`
}

type Model struct {
	ProviderID      string                 `json:"provider_id" yaml:"provider_id"`
	ModelID         string                 `json:"model_id" yaml:"model_id"`
	ProviderModelID string                 `json:"provider_model_id,omitempty" yaml:"provider_model_id,omitempty"`
	ModelType       string                 `json:"model_type" yaml:"model_type"`
	Metadata        map[string]interface{} `json:"metadata" yaml:"metadata"`
}

type ToolGroup struct {
	ToolGroupID string `json:"toolgroup_id" yaml:"toolgroup_id"`
	ProviderID  string `json:"provider_id" yaml:"provider_id"`
}

type Server struct {
	Port int `json:"port" yaml:"port"`
}

// NewDefaultLlamaStackConfig creates a new instance of LlamaStackConfig with default values
func NewDefaultLlamaStackConfig() *LlamaStackConfig {
	return &LlamaStackConfig{
		Version:   "2",
		ImageName: "rh",
		APIs: []string{
			"agents", "datasetio", "files", "inference",
			"safety", "scoring", "tool_runtime", "vector_io",
		},
		Providers: Providers{
			Inference: []Provider{NewSentenceTransformerProvider()},
			VectorIO: []Provider{
				NewProvider("milvus", "inline::milvus", map[string]interface{}{
					"db_path": "/opt/app-root/src/.llama/distributions/rh/milvus.db",
					"persistence": map[string]interface{}{
						"namespace": "vector_io::milvus",
						"backend":   "kv_default",
					},
				}),
			},
			Agents: []Provider{
				NewProvider("meta-reference", "inline::meta-reference", map[string]interface{}{
					"persistence": map[string]interface{}{
						"agent_state": map[string]interface{}{
							"namespace": "agents",
							"backend":   "kv_default",
						},
						"responses": map[string]interface{}{
							"table_name": "responses",
							"backend":    "sql_default",
						},
					},
				}),
			},
			Files: []Provider{
				NewProvider("meta-reference-files", "inline::localfs", map[string]interface{}{
					"storage_dir": "/opt/app-root/src/.llama/distributions/rh/files",
					"metadata_store": map[string]interface{}{
						"table_name": "files_metadata",
						"backend":    "sql_default",
					},
				}),
			},
			DatasetIO: []Provider{
				NewProvider("huggingface", "remote::huggingface", map[string]interface{}{
					"kvstore": map[string]interface{}{
						"namespace": "datasetio::huggingface",
						"backend":   "kv_default",
					},
				}),
			},
			Scoring: []Provider{
				NewProvider("basic", "inline::basic", EmptyConfig()),
				NewProvider("llm-as-judge", "inline::llm-as-judge", EmptyConfig()),
			},
			ToolRuntime: []Provider{
				NewProvider("rag-runtime", "inline::rag-runtime", EmptyConfig()),
				NewProvider("model-context-protocol", "remote::model-context-protocol", EmptyConfig()),
			},
		},
		ToolGroups: []ToolGroup{
			{
				ToolGroupID: "builtin::rag",
				ProviderID:  "rag-runtime",
			},
		},
		MetadataStore: MetadataStore{
			Type:   "sqlite",
			DBPath: "/opt/app-root/src/.llama/distributions/rh/inference_store.db",
		},
		Storage: Storage{
			Backends: map[string]interface{}{
				"kv_default": map[string]interface{}{
					"type":    "kv_sqlite",
					"db_path": "/opt/app-root/src/.llama/distributions/rh/kvstore.db",
				},
				"sql_default": map[string]interface{}{
					"type":    "sql_sqlite",
					"db_path": "/opt/app-root/src/.llama/distributions/rh/sql_store.db",
				},
			},
			Stores: map[string]interface{}{
				"metadata": map[string]interface{}{
					"namespace": "registry",
					"backend":   "kv_default",
				},
				"inference": map[string]interface{}{
					"table_name": "inference_store",
					"backend":    "sql_default",
				},
				"conversations": map[string]interface{}{
					"table_name": "openai_conversations",
					"backend":    "sql_default",
				},
			},
		},
		Server: Server{
			Port: 8321,
		},
	}
}

// ToYAML converts the config to YAML format
func (c *LlamaStackConfig) ToYAML() (string, error) {
	data, err := yaml.Marshal(c)
	if err != nil {
		return "", fmt.Errorf("failed to marshal config to YAML: %w", err)
	}
	return string(data), nil
}

// FromYAML parses YAML into the config
func (c *LlamaStackConfig) FromYAML(data string) error {
	if data == "" {
		return fmt.Errorf("YAML data is empty")
	}
	err := yaml.Unmarshal([]byte(data), c)
	if err != nil {
		return fmt.Errorf("failed to parse YAML: failed to unmarshal YAML into config: %w", err)
	}
	return nil
}

// ToJSON converts the config to JSON format
func (c *LlamaStackConfig) ToJSON() (string, error) {
	data, err := json.Marshal(c)
	if err != nil {
		return "", fmt.Errorf("failed to marshal config to JSON: %w", err)
	}
	return string(data), nil
}

// FromJSON parses JSON into the config
func (c *LlamaStackConfig) FromJSON(data string) error {
	err := json.Unmarshal([]byte(data), c)
	if err != nil {
		return fmt.Errorf("failed to unmarshal JSON into config: %w", err)
	}
	return nil
}

// NewModel creates a new Model instance with the given parameters
func NewModel(modelID, providerID, modelType string, metadata map[string]interface{}) Model {
	return Model{
		ModelID:    modelID,
		ProviderID: providerID,
		ModelType:  modelType,
		Metadata:   metadata,
	}
}

// NewEmbeddingModel creates a new embedding model with standard configuration
func NewEmbeddingModel(modelID, providerID, providerModelID string, embeddingDimension int) Model {
	return Model{
		ModelID:         modelID,
		ProviderID:      providerID,
		ProviderModelID: providerModelID,
		ModelType:       "embedding",
		Metadata: map[string]interface{}{
			"embedding_dimension": embeddingDimension,
		},
	}
}

// NewLLMModel creates a new LLM model with standard configuration
func NewLLMModel(modelID, providerID string, displayName string) Model {
	return Model{
		ModelID:    modelID,
		ProviderID: providerID,
		ModelType:  "llm",
		Metadata: map[string]interface{}{
			"display_name": displayName,
		},
	}
}

// AddModel adds a new model to the config
func (c *LlamaStackConfig) AddModel(model Model) {
	c.Models = append(c.Models, model)
}

// ParseModels parses a YAML string into a slice of Model
func ParseModels(yamlStr string) ([]Model, error) {
	var modelConfig struct {
		Models []Model `yaml:"models"`
	}
	err := yaml.Unmarshal([]byte(yamlStr), &modelConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to parse models YAML: %w", err)
	}
	return modelConfig.Models, nil
}

// NewProvider creates a new Provider instance with the given parameters
func NewProvider(providerID, providerType string, config map[string]interface{}) Provider {
	return Provider{
		ProviderID:   providerID,
		ProviderType: providerType,
		Config:       config,
	}
}

// NewInferenceProvider creates a new inference provider with standard configuration
func NewInferenceProvider(providerID string, url string) Provider {
	return Provider{
		ProviderID:   providerID,
		ProviderType: "remote::inference",
		Config: map[string]interface{}{
			"url": url,
		},
	}
}

// EmptyConfig returns an empty configuration map
func EmptyConfig() map[string]interface{} {
	return map[string]interface{}{}
}

// NewSentenceTransformerProvider creates a new sentence transformer provider
func NewSentenceTransformerProvider() Provider {
	return Provider{
		ProviderID:   "sentence-transformers",
		ProviderType: "inline::sentence-transformers",
		Config:       EmptyConfig(),
	}
}

// NewVLLMProvider creates a new vLLM provider with the given URL
func NewVLLMProvider(providerID string, url string) Provider {
	return Provider{
		ProviderID:   providerID,
		ProviderType: "remote::vllm",
		Config: map[string]interface{}{
			"url": url,
		},
	}
}

// AddVLLMProviderAndModel adds a vLLM provider and its corresponding model to the config
// This is a helper for building LlamaStack configurations with vLLM providers
func (c *LlamaStackConfig) AddVLLMProviderAndModel(providerID, endpointURL string, index int, modelID, modelType string, metadata map[string]interface{}) {
	// Create provider config
	providerConfig := EmptyConfig()
	providerConfig["url"] = endpointURL
	providerConfig["max_tokens"] = "${env.VLLM_MAX_TOKENS:=4096}"
	providerConfig["api_token"] = fmt.Sprintf("${env.VLLM_API_TOKEN_%d:=fake}", index+1)
	providerConfig["tls_verify"] = "${env.VLLM_TLS_VERIFY:=true}"

	// Add provider
	provider := NewProvider(providerID, "remote::vllm", providerConfig)
	c.AddInferenceProvider(provider)

	// Add model
	var model Model
	if metadata == nil {
		// For MaaS models or when no metadata is provided
		model = NewLLMModel(modelID, providerID, modelID)
	} else {
		// For regular models with metadata
		model = NewModel(modelID, providerID, modelType, metadata)
	}
	c.AddModel(model)
}

// AddInferenceProvider adds a new inference provider to the config
func (c *LlamaStackConfig) AddInferenceProvider(provider Provider) {
	c.Providers.Inference = append(c.Providers.Inference, provider)
}

// AddVectorIOProvider adds a new vector IO provider to the config
func (c *LlamaStackConfig) AddVectorIOProvider(provider Provider) {
	c.Providers.VectorIO = append(c.Providers.VectorIO, provider)
}

// AddAgentProvider adds a new agent provider to the config
func (c *LlamaStackConfig) AddAgentProvider(provider Provider) {
	c.Providers.Agents = append(c.Providers.Agents, provider)
}

// AddDatasetIOProvider adds a new dataset IO provider to the config
func (c *LlamaStackConfig) AddDatasetIOProvider(provider Provider) {
	c.Providers.DatasetIO = append(c.Providers.DatasetIO, provider)
}

// AddScoringProvider adds a new scoring provider to the config
func (c *LlamaStackConfig) AddScoringProvider(provider Provider) {
	c.Providers.Scoring = append(c.Providers.Scoring, provider)
}

// AddToolRuntimeProvider adds a new tool runtime provider to the config
func (c *LlamaStackConfig) AddToolRuntimeProvider(provider Provider) {
	c.Providers.ToolRuntime = append(c.Providers.ToolRuntime, provider)
}

// AddFilesProvider adds a new files provider to the config
func (c *LlamaStackConfig) AddFilesProvider(provider Provider) {
	c.Providers.Files = append(c.Providers.Files, provider)
}

// GetModelProviderInfo extracts model provider information for a given model ID
// This is a two-step process:
// 1. Find the model in the Models section and get its provider_id
// 2. Find that provider_id in the Providers.Inference section and get provider_type and url
func (c *LlamaStackConfig) GetModelProviderInfo(modelID string) (*types.ModelProviderInfo, error) {
	// Find model and provider_id
	// Handle two formats:
	// 1. Just model_id (e.g., "facebook/opt-125m")
	// 2. provider_id/model_id (e.g., "maas-vllm-inference-1/facebook/opt-125m")
	var providerID string
	var actualModelID string

	// First, try exact match with modelID as-is
	for _, model := range c.Models {
		if model.ModelID == modelID {
			providerID = model.ProviderID
			actualModelID = model.ModelID
			break
		}
	}

	// If not found, try matching with provider prefix stripped
	// Check if modelID matches pattern: provider_id/model_id
	if providerID == "" {
		for _, model := range c.Models {
			// Construct the provider-prefixed format and check if it matches
			providerPrefixedID := model.ProviderID + "/" + model.ModelID
			if providerPrefixedID == modelID {
				providerID = model.ProviderID
				actualModelID = model.ModelID
				break
			}
		}
	}
	if providerID == "" {
		return nil, fmt.Errorf("provider not found for model %s", modelID)
	}

	// Find provider details
	for _, provider := range c.Providers.Inference {
		if provider.ProviderID == providerID {
			url := ""
			if urlVal, ok := provider.Config["url"]; ok {
				if urlStr, ok := urlVal.(string); ok {
					url = cleanEnvVar(urlStr)
				}
			}

			return &types.ModelProviderInfo{
				ModelID:      actualModelID,
				ProviderID:   providerID,
				ProviderType: provider.ProviderType,
				URL:          url,
			}, nil
		}
	}

	return nil, fmt.Errorf("provider configuration not found for provider_id %s", providerID)
}

// cleanEnvVar removes environment variable placeholders like ${env.VAR:=default}
func cleanEnvVar(value string) string {
	if strings.HasPrefix(value, "${env.") && strings.Contains(value, ":=") {
		parts := strings.SplitN(value, ":=", 2)
		if len(parts) == 2 {
			return strings.TrimSuffix(parts[1], "}")
		}
	}
	return value
}

// Shield represents a safety and security configuration
type Shield struct {
	ShieldID   string                 `json:"shield_id" yaml:"shield_id"`
	ShieldType string                 `json:"shield_type" yaml:"shield_type"`
	ProviderID string                 `json:"provider_id" yaml:"provider_id"`
	Config     map[string]interface{} `json:"config" yaml:"config"`
	Metadata   map[string]interface{} `json:"metadata,omitempty" yaml:"metadata,omitempty"`
}

// VectorDB represents a vector database configuration
type VectorDB struct {
	DBID       string                 `json:"db_id" yaml:"db_id"`
	Name       string                 `json:"name" yaml:"name"`
	ProviderID string                 `json:"provider_id" yaml:"provider_id"`
	Config     map[string]interface{} `json:"config" yaml:"config"`
	Metadata   map[string]interface{} `json:"metadata,omitempty" yaml:"metadata,omitempty"`
}

// Dataset represents a dataset configuration
type Dataset struct {
	DatasetID   string                 `json:"dataset_id" yaml:"dataset_id"`
	Name        string                 `json:"name" yaml:"name"`
	ProviderID  string                 `json:"provider_id" yaml:"provider_id"`
	DatasetType string                 `json:"dataset_type" yaml:"dataset_type"`
	Config      map[string]interface{} `json:"config" yaml:"config"`
	Metadata    map[string]interface{} `json:"metadata,omitempty" yaml:"metadata,omitempty"`
}

// ScoringFn represents a scoring function configuration
type ScoringFn struct {
	FunctionID   string                 `json:"function_id" yaml:"function_id"`
	Name         string                 `json:"name" yaml:"name"`
	ProviderID   string                 `json:"provider_id" yaml:"provider_id"`
	FunctionType string                 `json:"function_type" yaml:"function_type"`
	Config       map[string]interface{} `json:"config" yaml:"config"`
	Metadata     map[string]interface{} `json:"metadata,omitempty" yaml:"metadata,omitempty"`
}

// Benchmark represents a benchmark configuration
type Benchmark struct {
	BenchmarkID   string                 `json:"benchmark_id" yaml:"benchmark_id"`
	Name          string                 `json:"name" yaml:"name"`
	BenchmarkType string                 `json:"benchmark_type" yaml:"benchmark_type"`
	Config        map[string]interface{} `json:"config" yaml:"config"`
	Metadata      map[string]interface{} `json:"metadata,omitempty" yaml:"metadata,omitempty"`
}

// NewShield creates a new Shield instance
func NewShield(shieldID, shieldType, providerID string, config map[string]interface{}) Shield {
	return Shield{
		ShieldID:   shieldID,
		ShieldType: shieldType,
		ProviderID: providerID,
		Config:     config,
		Metadata:   EmptyConfig(),
	}
}

// NewVectorDB creates a new VectorDB instance
func NewVectorDB(dbID, name, providerID string, config map[string]interface{}) VectorDB {
	return VectorDB{
		DBID:       dbID,
		Name:       name,
		ProviderID: providerID,
		Config:     config,
		Metadata:   EmptyConfig(),
	}
}

// NewDataset creates a new Dataset instance
func NewDataset(datasetID, name, providerID, datasetType string, config map[string]interface{}) Dataset {
	return Dataset{
		DatasetID:   datasetID,
		Name:        name,
		ProviderID:  providerID,
		DatasetType: datasetType,
		Config:      config,
		Metadata:    EmptyConfig(),
	}
}

// NewScoringFn creates a new ScoringFn instance
func NewScoringFn(functionID, name, providerID, functionType string, config map[string]interface{}) ScoringFn {
	return ScoringFn{
		FunctionID:   functionID,
		Name:         name,
		ProviderID:   providerID,
		FunctionType: functionType,
		Config:       config,
		Metadata:     EmptyConfig(),
	}
}

// NewBenchmark creates a new Benchmark instance
func NewBenchmark(benchmarkID, name, benchmarkType string, config map[string]interface{}) Benchmark {
	return Benchmark{
		BenchmarkID:   benchmarkID,
		Name:          name,
		BenchmarkType: benchmarkType,
		Config:        config,
		Metadata:      EmptyConfig(),
	}
}
