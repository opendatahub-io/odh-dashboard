package kubernetes

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/types"
	"gopkg.in/yaml.v2"
)

// LlamaStackConfig represents the main configuration structure
type LlamaStackConfig struct {
	Version             string              `json:"version" yaml:"version"`
	DistroName          string              `json:"distro_name" yaml:"distro_name"`
	APIs                []string            `json:"apis" yaml:"apis"`
	Providers           Providers           `json:"providers" yaml:"providers"`
	MetadataStore       MetadataStore       `json:"metadata_store" yaml:"metadata_store"`
	Storage             Storage             `json:"storage" yaml:"storage"`
	VectorStores        VectorStores        `json:"vector_stores" yaml:"vector_stores"`
	RegisteredResources RegisteredResources `json:"registered_resources" yaml:"registered_resources"`
	Server              Server              `json:"server" yaml:"server"`
}

// VectorStores configures the default vector store behavior for Llama Stack.
type VectorStores struct {
	DefaultProviderID     string                    `json:"default_provider_id" yaml:"default_provider_id"`
	DefaultEmbeddingModel VectorStoreModelReference `json:"default_embedding_model" yaml:"default_embedding_model"`
}

// VectorStoreModelReference references an embedding model by provider and model ID.
type VectorStoreModelReference struct {
	ProviderID string `json:"provider_id" yaml:"provider_id"`
	ModelID    string `json:"model_id" yaml:"model_id"`
}

type Providers struct {
	Inference   []Provider `json:"inference" yaml:"inference"`
	VectorIO    []Provider `json:"vector_io" yaml:"vector_io"`
	Responses   []Provider `json:"responses" yaml:"responses"`
	Eval        []Provider `json:"eval" yaml:"eval"`
	Files       []Provider `json:"files" yaml:"files"`
	DatasetIO   []Provider `json:"datasetio" yaml:"datasetio"`
	Scoring     []Provider `json:"scoring" yaml:"scoring"`
	ToolRuntime []Provider `json:"tool_runtime" yaml:"tool_runtime"`
	Safety      []Provider `json:"safety" yaml:"safety"`
}

type Provider struct {
	ProviderID   string                 `json:"provider_id" yaml:"provider_id"`
	ProviderType string                 `json:"provider_type" yaml:"provider_type"`
	Module       string                 `json:"module,omitempty" yaml:"module,omitempty"`
	Config       map[string]interface{} `json:"config" yaml:"config"`
}

type MetadataStore struct {
	Type   string `json:"type" yaml:"type"`
	DBPath string `json:"db_path" yaml:"db_path"`
}

type RegisteredResources struct {
	Models       []Model       `json:"models" yaml:"models"`
	Shields      []Shield      `json:"shields" yaml:"shields"`
	VectorStores []VectorStore `json:"vector_stores" yaml:"vector_stores"`
	Datasets     []Dataset     `json:"datasets" yaml:"datasets"`
	ScoringFns   []ScoringFn   `json:"scoring_fns" yaml:"scoring_fns"`
	Benchmarks   []Benchmark   `json:"benchmarks" yaml:"benchmarks"`
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
	MaxTokens       *int                   `json:"max_tokens,omitempty" yaml:"max_tokens,omitempty"` // Optional per-model token limit
	Metadata        map[string]interface{} `json:"metadata" yaml:"metadata"`
}

type Server struct {
	Port int   `json:"port" yaml:"port"`
	Auth *Auth `json:"auth,omitempty" yaml:"auth,omitempty"`
}

// Auth represents the authentication and authorization configuration for llama-stack server.
// It supports Kubernetes-based authentication with RBAC access control.
type Auth struct {
	ProviderConfig *KubernetesAuthProvider `json:"provider_config,omitempty" yaml:"provider_config,omitempty"`
	AccessPolicy   []AccessRule            `json:"access_policy,omitempty" yaml:"access_policy,omitempty"`
	RoutePolicy    []RouteAccessRule       `json:"route_policy,omitempty" yaml:"route_policy,omitempty"`
}

// KubernetesAuthProvider configures authentication using Kubernetes SelfSubjectReview API.
// This validates bearer tokens against the Kubernetes API server and extracts user identity.
type KubernetesAuthProvider struct {
	Type          string            `json:"type" yaml:"type"`                                         // Must be "kubernetes"
	APIServerURL  string            `json:"api_server_url" yaml:"api_server_url"`                     // Kubernetes API server URL
	VerifyTLS     bool              `json:"verify_tls" yaml:"verify_tls"`                             // Whether to verify TLS certificates
	TLSCAFile     string            `json:"tls_cafile,omitempty" yaml:"tls_cafile,omitempty"`         // Path to CA certificate file
	ClaimsMapping map[string]string `json:"claims_mapping,omitempty" yaml:"claims_mapping,omitempty"` // Maps Kubernetes claims to access attributes
}

// AccessRule defines resource-level access control based on Cedar policy language.
// Rules are evaluated in order; first match determines access.
type AccessRule struct {
	Permit      *Scope `json:"permit,omitempty" yaml:"permit,omitempty"`           // Actions to permit
	Forbid      *Scope `json:"forbid,omitempty" yaml:"forbid,omitempty"`           // Actions to forbid
	When        string `json:"when,omitempty" yaml:"when,omitempty"`               // Condition for rule to apply
	Unless      string `json:"unless,omitempty" yaml:"unless,omitempty"`           // Condition for rule to not apply
	Description string `json:"description,omitempty" yaml:"description,omitempty"` // Human-readable description
}

// RouteAccessRule defines infrastructure-level access control for API routes.
// Evaluated before resource-level access control.
type RouteAccessRule struct {
	Permit      *RouteScope `json:"permit,omitempty" yaml:"permit,omitempty"`           // Routes to permit
	Forbid      *RouteScope `json:"forbid,omitempty" yaml:"forbid,omitempty"`           // Routes to forbid
	When        string      `json:"when,omitempty" yaml:"when,omitempty"`               // Condition for rule to apply
	Unless      string      `json:"unless,omitempty" yaml:"unless,omitempty"`           // Condition for rule to not apply
	Description string      `json:"description,omitempty" yaml:"description,omitempty"` // Human-readable description
}

// Scope defines the scope of an access rule including principal, actions, and resource.
type Scope struct {
	Principal string   `json:"principal,omitempty" yaml:"principal,omitempty"` // Principal to match (optional)
	Actions   []string `json:"actions" yaml:"actions"`                         // Actions: create, read, update, delete
	Resource  string   `json:"resource,omitempty" yaml:"resource,omitempty"`   // Resource pattern to match (optional)
}

// RouteScope defines the scope of a route access rule.
type RouteScope struct {
	// Paths specifies API route patterns to match. Must be a string (single path)
	// or []string (multiple paths). Supports exact paths, prefix wildcards (e.g. "/v1/files*"),
	// and full wildcards ("*").
	Paths interface{} `json:"paths" yaml:"paths"`
}

// EnsureStorageField ensures the storage field is populated with defaults if missing
// llama-stack v0.4.0+ requires the storage field to be present with both backends and stores.
func (c *LlamaStackConfig) EnsureStorageField() {
	if len(c.Storage.Backends) == 0 || len(c.Storage.Stores) == 0 {
		defaultConfig := NewDefaultLlamaStackConfig()
		c.Storage = defaultConfig.Storage
	}
}

// NewDefaultLlamaStackConfig creates a new instance of LlamaStackConfig with default values
func NewDefaultLlamaStackConfig() *LlamaStackConfig {
	return &LlamaStackConfig{
		Version:    "2",
		DistroName: "rh",
		APIs: []string{
			"responses", "datasetio", "files", "inference",
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
			Responses: []Provider{
				NewProvider("builtin", "inline::builtin", map[string]interface{}{
					"persistence": map[string]interface{}{
						"agent_state": map[string]interface{}{
							"namespace": "agents",
							"backend":   "kv_default",
						},
						"responses": map[string]interface{}{
							"table_name":           "responses",
							"backend":              "sql_default",
							"max_write_queue_size": 10000,
							"num_writers":          4,
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
				NewProvider("file-search", "inline::file-search", EmptyConfig()),
				NewProvider("model-context-protocol", "remote::model-context-protocol", EmptyConfig()),
			},
		},
		RegisteredResources: RegisteredResources{
			// Ensure these serialize as `[]` (not `null`) when no values exist.
			Models:       []Model{},
			Shields:      []Shield{},
			VectorStores: []VectorStore{},
			Datasets:     []Dataset{},
			ScoringFns:   []ScoringFn{},
			Benchmarks:   []Benchmark{},
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
		VectorStores: VectorStores{
			DefaultProviderID: "milvus",
			DefaultEmbeddingModel: VectorStoreModelReference{
				ProviderID: "sentence-transformers",
				ModelID:    "ibm-granite/granite-embedding-125m-english",
			},
		},
		Server: Server{
			Port: 8321,
		},
	}
}

// RegisterModel adds the given model to the registered resources list.
func (c *LlamaStackConfig) RegisterModel(model Model) {
	c.RegisteredResources.Models = append(c.RegisteredResources.Models, model)
}

func (c *LlamaStackConfig) AddModel(model Model) {
	c.RegisterModel(model)
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
		ModelType:       string(models.ModelTypeEmbedding),
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
		ModelType:  string(models.ModelTypeLLM),
		Metadata: map[string]interface{}{
			"display_name": displayName,
		},
	}
}

// ParseModels parses a YAML string into a slice of Model
func ParseModels(yamlStr string) ([]Model, error) {
	var modelConfig struct {
		RegisteredResources RegisteredResources `yaml:"registered_resources"`
	}
	err := yaml.Unmarshal([]byte(yamlStr), &modelConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to parse models YAML: %w", err)
	}
	return modelConfig.RegisteredResources.Models, nil
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
			"base_url": url,
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
			"base_url": url,
		},
	}
}

// AddVLLMProviderAndModel adds a vLLM provider and its corresponding model to the config
// This is a helper for building LlamaStack configurations with vLLM providers
func (c *LlamaStackConfig) AddVLLMProviderAndModel(providerID, endpointURL string, index int, modelID, modelType string, metadata map[string]interface{}, maxTokens *int, embeddingDimension *int) {
	// Create provider config
	providerConfig := EmptyConfig()
	providerConfig["base_url"] = endpointURL
	providerConfig["max_tokens"] = "${env.VLLM_MAX_TOKENS:=4096}"
	providerConfig["api_token"] = fmt.Sprintf("${env.VLLM_API_TOKEN_%d:=fake}", index+1)
	providerConfig["tls_verify"] = "${env.VLLM_TLS_VERIFY:=true}"

	// Add provider
	provider := NewProvider(providerID, "remote::vllm", providerConfig)
	c.AddInferenceProvider(provider)

	// Add model
	var model Model
	if metadata == nil {
		if modelType == "embedding" {
			// Embedding model with no pre-existing metadata
			model = Model{
				ModelID:    modelID,
				ProviderID: providerID,
				ModelType:  "embedding",
				Metadata:   map[string]interface{}{"display_name": modelID},
			}
		} else {
			// Default to LLM model (handles MaaS models and general case)
			model = NewLLMModel(modelID, providerID, modelID)
		}
	} else {
		// For regular models with metadata
		model = NewModel(modelID, providerID, modelType, metadata)
	}

	// Set per-model max_tokens if provided
	if maxTokens != nil {
		model.MaxTokens = maxTokens
	}

	// Set embedding_dimension for embedding models (only meaningful for embedding models)
	if model.ModelType == "embedding" {
		if model.Metadata == nil {
			model.Metadata = make(map[string]interface{})
		}
		if embeddingDimension != nil {
			// User-specified value takes precedence
			model.Metadata["embedding_dimension"] = *embeddingDimension
		} else if _, alreadySet := model.Metadata["embedding_dimension"]; !alreadySet {
			// Default to 128 if not specified by the user or the model metadata
			model.Metadata["embedding_dimension"] = 128
		}
	}

	c.AddModel(model)
}

// AddCustomEndpointProviderAndModel adds a custom endpoint model provider and its corresponding model to the config
// This is a helper for building LlamaStack configurations with custom endpoint model providers.
// The API token/secret is NOT included in the config - it will be fetched at runtime from the ConfigMap secret reference.
// providerType must be the value stored in the gen-ai-aa-custom-model-endpoints ConfigMap (e.g. "remote::openai" or "remote::passthrough").
// isClusterLocal should be true for in-cluster service URLs (*.svc.cluster.local); this disables TLS verification
// since cluster services typically use self-signed certificates.
func (c *LlamaStackConfig) AddCustomEndpointProviderAndModel(providerID, endpointURL string, index int, modelID, modelType, providerType string, metadata map[string]interface{}, maxTokens *int, embeddingDimension *int, isClusterLocal bool) {
	// Create provider config - minimal config for external models
	// Full configuration (including secrets) is managed via the gen-ai-aa-custom-model-endpoints ConfigMap
	providerConfig := EmptyConfig()
	providerConfig["base_url"] = endpointURL
	// Note: api_token and max_tokens are NOT added here - managed via ConfigMap

	if isClusterLocal {
		providerConfig["network"] = map[string]interface{}{
			"tls": map[string]interface{}{
				"verify": false,
			},
		}
	}

	provider := NewProvider(providerID, providerType, providerConfig)
	c.AddInferenceProvider(provider)

	// Add model
	var model Model
	if metadata == nil {
		if modelType == "embedding" {
			// Embedding model with no pre-existing metadata
			model = Model{
				ModelID:    modelID,
				ProviderID: providerID,
				ModelType:  "embedding",
				Metadata:   map[string]interface{}{"display_name": modelID},
			}
		} else {
			model = NewLLMModel(modelID, providerID, modelID)
		}
	} else {
		model = NewModel(modelID, providerID, modelType, metadata)
	}

	// Set per-model max_tokens if provided
	if maxTokens != nil {
		model.MaxTokens = maxTokens
	}

	// Set embedding_dimension for embedding models (only meaningful for embedding models)
	if model.ModelType == "embedding" {
		if model.Metadata == nil {
			model.Metadata = make(map[string]interface{})
		}
		if embeddingDimension != nil {
			// User-specified value takes precedence
			model.Metadata["embedding_dimension"] = *embeddingDimension
		} else if _, alreadySet := model.Metadata["embedding_dimension"]; !alreadySet {
			// Default to 128 if not specified by the user or the model metadata
			model.Metadata["embedding_dimension"] = 128
		}
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

// AddResponsesProvider adds a new responses provider to the config
func (c *LlamaStackConfig) AddResponsesProvider(provider Provider) {
	c.Providers.Responses = append(c.Providers.Responses, provider)
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

// RegisterVectorStore adds a vector store to the registered resources.
func (c *LlamaStackConfig) RegisterVectorStore(store VectorStore) {
	c.RegisteredResources.VectorStores = append(c.RegisteredResources.VectorStores, store)
}

// GetModelProviderInfo extracts model provider information for a given model ID
// This is a two-step process:
// 1. Find the model in the Models section and get its provider_id
// 2. Find that provider_id in the Providers.Inference section and get provider_type and url
func (c *LlamaStackConfig) GetModelProviderInfo(modelID string) (*types.ModelProviderInfo, error) {
	models := c.RegisteredResources.Models
	// Find model and provider_id
	// Handle two formats:
	// 1. Just model_id (e.g., "facebook/opt-125m")
	// 2. provider_id/model_id (e.g., "maas-vllm-inference-1/facebook/opt-125m")
	var providerID string
	var actualModelID string

	// First, try exact match with modelID as-is
	for _, model := range models {
		if model.ModelID == modelID {
			providerID = model.ProviderID
			actualModelID = model.ModelID
			break
		}
	}

	// If not found, try matching with provider prefix stripped
	// Check if modelID matches pattern: provider_id/model_id
	if providerID == "" {
		for _, model := range models {
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
			// Try base_url first (llama-stack v0.4.0+), fallback to url for backward compatibility
			if urlVal, ok := provider.Config["base_url"]; ok {
				if urlStr, ok := urlVal.(string); ok {
					url = cleanEnvVar(urlStr)
				}
			} else if urlVal, ok := provider.Config["url"]; ok {
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

// VectorStore represents a vector store configuration in registered_resources
type VectorStore struct {
	VectorStoreID         string                 `json:"vector_store_id" yaml:"vector_store_id"`
	EmbeddingModel        string                 `json:"embedding_model" yaml:"embedding_model"`
	EmbeddingDimension    int                    `json:"embedding_dimension" yaml:"embedding_dimension"`
	ProviderID            string                 `json:"provider_id,omitempty" yaml:"provider_id,omitempty"`
	ProviderVectorStoreID string                 `json:"provider_vector_store_id,omitempty" yaml:"provider_vector_store_id,omitempty"`
	VectorStoreName       string                 `json:"vector_store_name,omitempty" yaml:"vector_store_name,omitempty"`
	Metadata              map[string]interface{} `json:"metadata,omitempty" yaml:"metadata,omitempty"`
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

// NewVectorStore creates a new VectorStore instance
func NewVectorStore(vectorStoreID, embeddingModel string, embeddingDimension int) VectorStore {
	return VectorStore{
		VectorStoreID:      vectorStoreID,
		EmbeddingModel:     embeddingModel,
		EmbeddingDimension: embeddingDimension,
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

// EnableRBACAuth enables RBAC authentication using the Kubernetes auth provider.
// This configures the server to validate tokens against the Kubernetes API server
// and apply access control rules based on user groups.
//
// Default access policy:
//   - admin group: full access (create, read, delete)
//   - system:authenticated: read-only access
//
// Parameters:
//   - apiServerURL: Kubernetes API server URL (use empty string for in-cluster default)
//   - tlsCAFile: Path to CA certificate file (use empty string for default service account CA)
func (c *LlamaStackConfig) EnableRBACAuth(apiServerURL, tlsCAFile string) {
	c.EnableRBACAuthWithCustomPolicy(apiServerURL, tlsCAFile, NewDefaultAccessPolicy())
}

// EnableRBACAuthWithCustomPolicy enables RBAC authentication with custom access policies.
// Use this when you need to define custom access rules beyond the defaults.
func (c *LlamaStackConfig) EnableRBACAuthWithCustomPolicy(apiServerURL, tlsCAFile string, accessPolicy []AccessRule) {
	// Use defaults if not provided
	if apiServerURL == "" {
		apiServerURL = "${env.OPENSHIFT_SERVER_API_URL:=https://kubernetes.default.svc}"
	}
	if tlsCAFile == "" {
		tlsCAFile = "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
	}

	c.Server.Auth = &Auth{
		ProviderConfig: &KubernetesAuthProvider{
			Type:         "kubernetes",
			APIServerURL: apiServerURL,
			VerifyTLS:    true,
			TLSCAFile:    tlsCAFile,
			ClaimsMapping: map[string]string{
				"groups":   "roles",
				"username": "roles",
			},
		},
		AccessPolicy: accessPolicy,
	}
}

// DisableRBACAuth disables RBAC authentication by removing the auth configuration.
func (c *LlamaStackConfig) DisableRBACAuth() {
	c.Server.Auth = nil
}

// SetRoutePolicy sets the route-level access policy for the server.
// Route policy controls access to API endpoints before resource-level checks.
func (c *LlamaStackConfig) SetRoutePolicy(routePolicy []RouteAccessRule) {
	if c.Server.Auth == nil {
		c.Server.Auth = &Auth{}
	}
	c.Server.Auth.RoutePolicy = routePolicy
}

// NewDefaultAccessPolicy returns the default RBAC access policy for OpenShift integration.
// - admin group: full access (create, read, delete)
// - system:authenticated: read-only access
func NewDefaultAccessPolicy() []AccessRule {
	return []AccessRule{
		{
			Permit: &Scope{
				Actions: []string{"create", "read", "delete"},
			},
			When:        "user with admin in roles",
			Description: "admin users have full access to all resources",
		},
		{
			Permit: &Scope{
				Actions: []string{"read"},
			},
			When:        "user with system:authenticated in roles",
			Description: "authenticated users have read-only access",
		},
	}
}

// NewAccessRule creates a new access rule with the specified parameters.
func NewAccessRule(actions []string, when, description string) AccessRule {
	return AccessRule{
		Permit: &Scope{
			Actions: actions,
		},
		When:        when,
		Description: description,
	}
}

// NewForbidAccessRule creates a new forbid access rule with the specified parameters.
func NewForbidAccessRule(actions []string, unless, description string) AccessRule {
	return AccessRule{
		Forbid: &Scope{
			Actions: actions,
		},
		Unless:      unless,
		Description: description,
	}
}

// NewRouteAccessRule creates a new route access rule for the specified paths.
func NewRouteAccessRule(paths interface{}, when, description string) RouteAccessRule {
	return RouteAccessRule{
		Permit: &RouteScope{
			Paths: paths,
		},
		When:        when,
		Description: description,
	}
}
