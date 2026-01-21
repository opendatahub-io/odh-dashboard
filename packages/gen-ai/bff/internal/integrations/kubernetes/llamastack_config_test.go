package kubernetes

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v2"
)

// loadTestData loads test fixture files from the testdata directory
func loadTestData(t *testing.T, filename string) string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("testdata", filename))
	require.NoError(t, err, "failed to load test data file: %s", filename)
	return string(data)
}

func TestLlamaStackConfig_Conversions(t *testing.T) {
	config := NewDefaultLlamaStackConfig()

	// Test YAML conversion
	yamlStr, err := config.ToYAML()
	assert.NoError(t, err)
	assert.Contains(t, yamlStr, "version: \"2\"")
	assert.Contains(t, yamlStr, "image_name: rh")
	assert.Contains(t, yamlStr, "vector_stores:")
	assert.Contains(t, yamlStr, "default_provider_id: milvus")

	// Test JSON conversion
	jsonStr, err := config.ToJSON()
	assert.NoError(t, err)
	assert.Contains(t, jsonStr, "\"version\":\"2\"")
	assert.Contains(t, jsonStr, "\"image_name\":\"rh\"")
	assert.Contains(t, jsonStr, "\"vector_stores\"")
	assert.Contains(t, jsonStr, "\"default_provider_id\":\"milvus\"")

	// Test parsing YAML
	var parsedConfig LlamaStackConfig
	err = parsedConfig.FromYAML(yamlStr)
	assert.NoError(t, err)
	assert.Equal(t, config.Version, parsedConfig.Version)
	assert.Equal(t, config.ImageName, parsedConfig.ImageName)
	assert.Equal(t, "milvus", parsedConfig.VectorStores.DefaultProviderID)
	assert.Equal(t, "sentence-transformers", parsedConfig.VectorStores.DefaultEmbeddingModel.ProviderID)
	assert.Equal(t, "ibm-granite/granite-embedding-125m-english", parsedConfig.VectorStores.DefaultEmbeddingModel.ModelID)

	// Test parsing JSON
	var parsedJSONConfig LlamaStackConfig
	err = parsedJSONConfig.FromJSON(jsonStr)
	assert.NoError(t, err)
	assert.Equal(t, config.Version, parsedJSONConfig.Version)
	assert.Equal(t, config.ImageName, parsedJSONConfig.ImageName)
	assert.Equal(t, "milvus", parsedJSONConfig.VectorStores.DefaultProviderID)
	assert.Equal(t, "sentence-transformers", parsedJSONConfig.VectorStores.DefaultEmbeddingModel.ProviderID)
	assert.Equal(t, "ibm-granite/granite-embedding-125m-english", parsedJSONConfig.VectorStores.DefaultEmbeddingModel.ModelID)
}

func TestProviderCreationUtilities(t *testing.T) {
	config := NewDefaultLlamaStackConfig()

	// Test NewProvider
	customConfig := map[string]interface{}{"key": "value"}
	provider1 := NewProvider("test-provider", "test::type", customConfig)
	assert.Equal(t, "test-provider", provider1.ProviderID)
	assert.Equal(t, "test::type", provider1.ProviderType)
	assert.Equal(t, "value", provider1.Config["key"])

	// Test NewInferenceProvider
	provider2 := NewInferenceProvider("inference-1", "http://example.com")
	assert.Equal(t, "inference-1", provider2.ProviderID)
	assert.Equal(t, "remote::inference", provider2.ProviderType)
	assert.Equal(t, "http://example.com", provider2.Config["base_url"])

	// Test NewSentenceTransformerProvider
	provider3 := NewSentenceTransformerProvider()
	assert.Equal(t, "sentence-transformers", provider3.ProviderID)
	assert.Equal(t, "inline::sentence-transformers", provider3.ProviderType)
	assert.Equal(t, EmptyConfig(), provider3.Config)

	// Test NewVLLMProvider
	provider4 := NewVLLMProvider("vllm-1", "http://vllm.example.com")
	assert.Equal(t, "vllm-1", provider4.ProviderID)
	assert.Equal(t, "remote::vllm", provider4.ProviderType)
	assert.Equal(t, "http://vllm.example.com", provider4.Config["base_url"])

	// Test adding providers to config
	config.AddInferenceProvider(provider1)
	config.AddInferenceProvider(provider2)
	// default SentenceTransformerProvider already added; so we should have 3
	assert.Equal(t, 3, len(config.Providers.Inference))

	config.AddVectorIOProvider(provider1)
	// default IOProvider already added; so we should have 2
	assert.Equal(t, 2, len(config.Providers.VectorIO))

	// default files provider already added; adding one more
	config.AddFilesProvider(provider1)
	assert.Equal(t, 2, len(config.Providers.Files))

	// default agent provider already added; adding one more
	config.AddAgentProvider(provider1)
	assert.Equal(t, 2, len(config.Providers.Agents))

	// default datasetio provider already added; adding one more
	config.AddDatasetIOProvider(provider1)
	assert.Equal(t, 2, len(config.Providers.DatasetIO))

	// default scoring providers already added; adding one more
	config.AddScoringProvider(provider1)
	assert.Equal(t, 3, len(config.Providers.Scoring))

	// default tool runtime providers already added; adding one more
	config.AddToolRuntimeProvider(provider1)
	assert.Equal(t, 3, len(config.Providers.ToolRuntime))
}

func TestDefaultConfig_Validation(t *testing.T) {
	config := NewDefaultLlamaStackConfig()

	// Test that default config can be marshaled to both YAML and JSON
	yamlData, err := yaml.Marshal(config)
	assert.NoError(t, err)
	assert.True(t, len(yamlData) > 0)

	jsonData, err := json.Marshal(config)
	assert.NoError(t, err)
	assert.True(t, len(jsonData) > 0)

	// Test that all required fields are present
	assert.NotEmpty(t, config.Version)
	assert.NotEmpty(t, config.ImageName)
	assert.NotEmpty(t, config.APIs)
	assert.NotNil(t, config.Providers)
	assert.NotNil(t, config.MetadataStore)
}

func TestNewTypes(t *testing.T) {
	// Test Shield creation
	shieldConfig := EmptyConfig()
	shieldConfig["threshold"] = 0.8
	shield := NewShield("toxicity", "content-filter", "safety-provider", shieldConfig)
	assert.Equal(t, "toxicity", shield.ShieldID)
	assert.Equal(t, "content-filter", shield.ShieldType)
	assert.Equal(t, "safety-provider", shield.ProviderID)
	assert.Equal(t, float64(0.8), shield.Config["threshold"])
	assert.NotNil(t, shield.Metadata)

	// Test VectorDB creation
	dbConfig := EmptyConfig()
	dbConfig["dimension"] = 768
	vectorDB := NewVectorDB("test-db", "Test Database", "milvus", dbConfig)
	assert.Equal(t, "test-db", vectorDB.DBID)
	assert.Equal(t, "Test Database", vectorDB.Name)
	assert.Equal(t, "milvus", vectorDB.ProviderID)
	assert.Equal(t, 768, vectorDB.Config["dimension"])
	assert.NotNil(t, vectorDB.Metadata)

	// Test Dataset creation
	datasetConfig := EmptyConfig()
	datasetConfig["source"] = "huggingface"
	dataset := NewDataset("test-dataset", "Test Dataset", "huggingface", "text", datasetConfig)
	assert.Equal(t, "test-dataset", dataset.DatasetID)
	assert.Equal(t, "Test Dataset", dataset.Name)
	assert.Equal(t, "huggingface", dataset.ProviderID)
	assert.Equal(t, "text", dataset.DatasetType)
	assert.Equal(t, "huggingface", dataset.Config["source"])
	assert.NotNil(t, dataset.Metadata)

	// Test ScoringFn creation
	scoringConfig := EmptyConfig()
	scoringConfig["metric"] = "accuracy"
	scoringFn := NewScoringFn("test-fn", "Test Function", "basic", "classification", scoringConfig)
	assert.Equal(t, "test-fn", scoringFn.FunctionID)
	assert.Equal(t, "Test Function", scoringFn.Name)
	assert.Equal(t, "basic", scoringFn.ProviderID)
	assert.Equal(t, "classification", scoringFn.FunctionType)
	assert.Equal(t, "accuracy", scoringFn.Config["metric"])
	assert.NotNil(t, scoringFn.Metadata)

	// Test Benchmark creation
	benchConfig := EmptyConfig()
	benchConfig["iterations"] = 100
	benchmark := NewBenchmark("test-bench", "Test Benchmark", "performance", benchConfig)
	assert.Equal(t, "test-bench", benchmark.BenchmarkID)
	assert.Equal(t, "Test Benchmark", benchmark.Name)
	assert.Equal(t, "performance", benchmark.BenchmarkType)
	assert.Equal(t, 100, benchmark.Config["iterations"])
	assert.NotNil(t, benchmark.Metadata)
}

func TestGetModelProviderInfo(t *testing.T) {
	// Create default test config with models and providers
	config := NewDefaultLlamaStackConfig()

	// Add test providers
	vllmProvider := NewVLLMProvider("vllm-inference-1", "http://vllm.example.com/v1")
	config.AddInferenceProvider(vllmProvider)

	maasProvider := NewVLLMProvider("maas-vllm-inference-1", "http://maas.example.com/v1")
	config.AddInferenceProvider(maasProvider)

	watsonxProvider := NewProvider("maas-watsonx", "remote::watsonx", map[string]interface{}{
		"url": "https://watsonx.example.com/v1",
	})
	config.AddInferenceProvider(watsonxProvider)

	// Add test models
	model1 := NewModel("llama-32-3b-instruct", "vllm-inference-1", "llm", nil)
	config.AddModel(model1)

	model2 := NewModel("facebook/opt-125m", "maas-vllm-inference-1", "llm", nil)
	config.AddModel(model2)

	model3 := NewModel("granite-3.1-8b-instruct", "maas-watsonx", "llm", nil)
	config.AddModel(model3)

	tests := []struct {
		name                 string
		modelID              string
		expectedModelID      string
		expectedProviderID   string
		expectedProviderType string
		expectError          bool
	}{
		{
			name:                 "Direct model ID without slash",
			modelID:              "llama-32-3b-instruct",
			expectedModelID:      "llama-32-3b-instruct",
			expectedProviderID:   "vllm-inference-1",
			expectedProviderType: "remote::vllm",
			expectError:          false,
		},
		{
			name:                 "Direct model ID with slash",
			modelID:              "facebook/opt-125m",
			expectedModelID:      "facebook/opt-125m",
			expectedProviderID:   "maas-vllm-inference-1",
			expectedProviderType: "remote::vllm",
			expectError:          false,
		},
		{
			name:                 "Provider-prefixed model ID without slash in model",
			modelID:              "vllm-inference-1/llama-32-3b-instruct",
			expectedModelID:      "llama-32-3b-instruct",
			expectedProviderID:   "vllm-inference-1",
			expectedProviderType: "remote::vllm",
			expectError:          false,
		},
		{
			name:                 "Provider-prefixed model ID with slash in model",
			modelID:              "maas-vllm-inference-1/facebook/opt-125m",
			expectedModelID:      "facebook/opt-125m",
			expectedProviderID:   "maas-vllm-inference-1",
			expectedProviderType: "remote::vllm",
			expectError:          false,
		},
		{
			name:                 "MaaS watsonx with provider prefix",
			modelID:              "maas-watsonx/granite-3.1-8b-instruct",
			expectedModelID:      "granite-3.1-8b-instruct",
			expectedProviderID:   "maas-watsonx",
			expectedProviderType: "remote::watsonx",
			expectError:          false,
		},
		{
			name:        "Non-existent model",
			modelID:     "non-existent-model",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := config.GetModelProviderInfo(tt.modelID)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
				return
			}

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tt.expectedModelID, result.ModelID, "ModelID should match the actual model_id from config")
			assert.Equal(t, tt.expectedProviderID, result.ProviderID, "ProviderID should match")
			assert.Equal(t, tt.expectedProviderType, result.ProviderType, "ProviderType should match")
		})
	}
}

func TestGetModelProviderInfo_LoadFromYAML(t *testing.T) {
	// Load test config from yaml file in testdata directory
	mockLlamaStackConfigYAML := loadTestData(t, "test_llama_stack_config.yaml")

	tests := []struct {
		name                 string
		modelID              string
		expectedModelID      string // The actual model_id in the config (may differ from input when provider prefix is used)
		expectedProviderID   string
		expectedProviderType string
		expectedURL          string
		expectError          bool
	}{
		{
			name:                 "Extract vLLM model (non-MaaS)",
			modelID:              "llama-32-3b-instruct",
			expectedModelID:      "llama-32-3b-instruct",
			expectedProviderID:   "vllm-inference-1",
			expectedProviderType: "remote::vllm",
			expectedURL:          "http://llama-32-3b-instruct-predictor.crimson-show.svc.cluster.local/v1",
			expectError:          false,
		},
		{
			name:                 "Extract embedding model",
			modelID:              "granite-embedding-125m",
			expectedModelID:      "granite-embedding-125m",
			expectedProviderID:   "sentence-transformers",
			expectedProviderType: "inline::sentence-transformers",
			expectedURL:          "", // No URL in config for this provider
			expectError:          false,
		},
		{
			name:                 "Extract MaaS model (watsonx)",
			modelID:              "granite-3.1-8b-instruct",
			expectedModelID:      "granite-3.1-8b-instruct",
			expectedProviderID:   "maas-watsonx",
			expectedProviderType: "remote::watsonx",
			expectedURL:          "https://us-south.ml.cloud.ibm.com/ml/v1",
			expectError:          false,
		},
		{
			name:                 "Extract MaaS model with provider prefix (watsonx)",
			modelID:              "maas-watsonx/granite-3.1-8b-instruct",
			expectedModelID:      "granite-3.1-8b-instruct",
			expectedProviderID:   "maas-watsonx",
			expectedProviderType: "remote::watsonx",
			expectedURL:          "https://us-south.ml.cloud.ibm.com/ml/v1",
			expectError:          false,
		},
		{
			name:                 "Extract vLLM model with provider prefix",
			modelID:              "vllm-inference-1/llama-32-3b-instruct",
			expectedModelID:      "llama-32-3b-instruct",
			expectedProviderID:   "vllm-inference-1",
			expectedProviderType: "remote::vllm",
			expectedURL:          "http://llama-32-3b-instruct-predictor.crimson-show.svc.cluster.local/v1",
			expectError:          false,
		},
		{
			name:                 "Extract MaaS model with slash in model ID (facebook/opt-125m)",
			modelID:              "facebook/opt-125m",
			expectedModelID:      "facebook/opt-125m",
			expectedProviderID:   "maas-vllm-inference-1",
			expectedProviderType: "remote::vllm",
			expectedURL:          "http://maas.apps.rosa.crimson-demo.g9ax.p3.openshiftapps.com/llm/facebook-opt-125m-simulated/v1",
			expectError:          false,
		},
		{
			name:                 "Extract MaaS model with provider prefix and slash in model ID (maas-vllm-inference-1/facebook/opt-125m)",
			modelID:              "maas-vllm-inference-1/facebook/opt-125m",
			expectedModelID:      "facebook/opt-125m",
			expectedProviderID:   "maas-vllm-inference-1",
			expectedProviderType: "remote::vllm",
			expectedURL:          "http://maas.apps.rosa.crimson-demo.g9ax.p3.openshiftapps.com/llm/facebook-opt-125m-simulated/v1",
			expectError:          false,
		},
		{
			name:        "Non-existent model",
			modelID:     "non-existent-model",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var config LlamaStackConfig
			err := config.FromYAML(mockLlamaStackConfigYAML)
			require.NoError(t, err)
			result, err := config.GetModelProviderInfo(tt.modelID)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
				return
			}

			require.NoError(t, err)
			require.NotNil(t, result)

			// Verify extracted fields
			assert.Equal(t, tt.expectedModelID, result.ModelID, "ModelID should match the actual model_id from config")
			assert.Equal(t, tt.expectedProviderID, result.ProviderID, "ProviderID should match")
			assert.Equal(t, tt.expectedProviderType, result.ProviderType, "ProviderType should match")
			assert.Equal(t, tt.expectedURL, result.URL, "URL should match")
		})
	}
}

func TestGetModelProviderInfo_EnvVarCleaning(t *testing.T) {
	// Load test data from testdata directory
	mockLlamaStackConfigYAML := loadTestData(t, "test_llama_stack_config.yaml")

	// Test that environment variable placeholders are cleaned
	var config LlamaStackConfig
	err := config.FromYAML(mockLlamaStackConfigYAML)
	require.NoError(t, err)
	result, err := config.GetModelProviderInfo("llama-32-3b-instruct")

	require.NoError(t, err)
	require.NotNil(t, result)

	// URL should have env var cleaned (${env.VLLM_MAX_TOKENS:=4096} should not appear)
	assert.NotContains(t, result.URL, "${env.", "URL should not contain environment variable placeholders")
	assert.NotContains(t, result.URL, ":=", "URL should not contain default value syntax")
}

func TestGetModelProviderInfo_MaaSDetection(t *testing.T) {
	// Load test data from testdata directory
	mockLlamaStackConfigYAML := loadTestData(t, "test_llama_stack_config.yaml")

	tests := []struct {
		name    string
		modelID string
		isMaaS  bool
	}{
		{
			name:    "vLLM model is not MaaS",
			modelID: "llama-32-3b-instruct",
			isMaaS:  false,
		},
		{
			name:    "Sentence transformers model is not MaaS",
			modelID: "granite-embedding-125m",
			isMaaS:  false,
		},
		{
			name:    "Watsonx model is MaaS",
			modelID: "granite-3.1-8b-instruct",
			isMaaS:  true,
		},
	}

	var config LlamaStackConfig
	err := config.FromYAML(mockLlamaStackConfigYAML)
	require.NoError(t, err)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := config.GetModelProviderInfo(tt.modelID)

			require.NoError(t, err)
			require.NotNil(t, result)

			// Check if provider_id starts with "maas-"
			isMaaS := len(result.ProviderID) >= 5 && result.ProviderID[:5] == "maas-"
			assert.Equal(t, tt.isMaaS, isMaaS, "MaaS detection should match expected value")
		})
	}
}

func TestGetModelProviderInfo_EdgeCases(t *testing.T) {
	t.Run("should handle invalid YAML", func(t *testing.T) {
		invalidYAML := "this is not { valid yaml: ["
		var config LlamaStackConfig
		err := config.FromYAML(invalidYAML)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to parse YAML")
		result, err := config.GetModelProviderInfo("any-model")
		assert.Error(t, err)
		assert.Nil(t, result)
	})

	t.Run("should handle empty YAML", func(t *testing.T) {
		emptyYAML := ""
		var config LlamaStackConfig
		err := config.FromYAML(emptyYAML)
		assert.Error(t, err)
		result, err := config.GetModelProviderInfo("any-model")
		assert.Error(t, err)
		assert.Nil(t, result)
	})

	t.Run("should handle YAML with no models section", func(t *testing.T) {
		yamlWithoutModels := `
version: "2"
providers:
  inference:
    - provider_id: test-provider
      provider_type: test::type
      config:
        url: https://test.com
`
		var config LlamaStackConfig
		err := config.FromYAML(yamlWithoutModels)
		require.NoError(t, err)
		result, err := config.GetModelProviderInfo("any-model")
		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "provider not found for model")
	})

	t.Run("should handle YAML with no providers section", func(t *testing.T) {
		yamlWithoutProviders := `
version: "2"
registered_resources:
  models:
    - model_id: test-model
      provider_id: test-provider
`
		var config LlamaStackConfig
		err := config.FromYAML(yamlWithoutProviders)
		require.NoError(t, err)
		result, err := config.GetModelProviderInfo("test-model")
		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "provider configuration not found")
	})

	t.Run("should handle model with provider that doesn't exist in providers section", func(t *testing.T) {
		yamlWithMissingProvider := `
version: "2"
registered_resources:
  models:
    - model_id: test-model
      provider_id: non-existent-provider
providers:
  inference:
    - provider_id: different-provider
      provider_type: test::type
      config:
        url: https://test.com
`
		var config LlamaStackConfig
		err := config.FromYAML(yamlWithMissingProvider)
		require.NoError(t, err)
		result, err := config.GetModelProviderInfo("test-model")
		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "provider configuration not found for provider_id non-existent-provider")
	})
}

func TestGetModelProviderInfo_YAMLStructureParsing(t *testing.T) {
	t.Run("should correctly parse all fields from well-formed YAML", func(t *testing.T) {
		wellFormedYAML := `
version: "2"
registered_resources:
  models:
    - model_id: test-model-1
      provider_id: test-provider-1
      model_type: llm
    - model_id: test-model-2
      provider_id: test-provider-2
      model_type: embedding
providers:
  inference:
    - provider_id: test-provider-1
      provider_type: remote::test
      config:
        url: https://provider1.test.com/v1/endpoint
        api_key: fake-key
    - provider_id: test-provider-2
      provider_type: inline::local
      config: {}
`
		var config LlamaStackConfig
		err := config.FromYAML(wellFormedYAML)
		require.NoError(t, err)

		// Test first model
		result1, err := config.GetModelProviderInfo("test-model-1")
		require.NoError(t, err)
		require.NotNil(t, result1)
		assert.Equal(t, "test-model-1", result1.ModelID)
		assert.Equal(t, "test-provider-1", result1.ProviderID)
		assert.Equal(t, "remote::test", result1.ProviderType)
		assert.Equal(t, "https://provider1.test.com/v1/endpoint", result1.URL)

		// Test second model
		result2, err := config.GetModelProviderInfo("test-model-2")
		require.NoError(t, err)
		require.NotNil(t, result2)
		assert.Equal(t, "test-model-2", result2.ModelID)
		assert.Equal(t, "test-provider-2", result2.ProviderID)
		assert.Equal(t, "inline::local", result2.ProviderType)
		assert.Equal(t, "", result2.URL) // No URL in config
	})

	t.Run("should handle provider without URL in config", func(t *testing.T) {
		yamlWithoutURL := `
version: "2"
registered_resources:
  models:
    - model_id: local-model
      provider_id: local-provider
providers:
  inference:
    - provider_id: local-provider
      provider_type: inline::local
      config:
        some_other_field: value
`
		var config LlamaStackConfig
		err := config.FromYAML(yamlWithoutURL)
		require.NoError(t, err)

		result, err := config.GetModelProviderInfo("local-model")
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, "local-model", result.ModelID)
		assert.Equal(t, "local-provider", result.ProviderID)
		assert.Equal(t, "inline::local", result.ProviderType)
		assert.Equal(t, "", result.URL)
	})
}

func TestEnsureStorageField(t *testing.T) {
	t.Run("should add storage field when missing", func(t *testing.T) {
		yamlWithoutStorage := `
version: "2"
image_name: rh
apis:
  - inference
providers:
  inference: []
registered_resources:
  models: []
`
		var config LlamaStackConfig
		err := config.FromYAML(yamlWithoutStorage)
		require.NoError(t, err)

		// Verify storage is empty before
		assert.Equal(t, 0, len(config.Storage.Backends))
		assert.Equal(t, 0, len(config.Storage.Stores))

		// Call EnsureStorageField
		config.EnsureStorageField()

		// Verify storage is populated with defaults
		assert.Greater(t, len(config.Storage.Backends), 0, "Backends should be populated")
		assert.Greater(t, len(config.Storage.Stores), 0, "Stores should be populated")

		// Verify default backends exist
		assert.Contains(t, config.Storage.Backends, "kv_default")
		assert.Contains(t, config.Storage.Backends, "sql_default")

		// Verify default stores exist
		assert.Contains(t, config.Storage.Stores, "metadata")
		assert.Contains(t, config.Storage.Stores, "inference")
		assert.Contains(t, config.Storage.Stores, "conversations")
	})

	t.Run("should not modify storage field when already present", func(t *testing.T) {
		yamlWithStorage := `
version: "2"
image_name: rh
apis:
  - inference
providers:
  inference: []
registered_resources:
  models: []
storage:
  backends:
    custom_backend:
      type: custom
      path: /custom/path
  stores:
    custom_store:
      namespace: custom
      backend: custom_backend
`
		var config LlamaStackConfig
		err := config.FromYAML(yamlWithStorage)
		require.NoError(t, err)

		// Verify custom storage is present
		assert.Contains(t, config.Storage.Backends, "custom_backend")
		assert.Contains(t, config.Storage.Stores, "custom_store")

		// Store original values
		originalBackends := config.Storage.Backends
		originalStores := config.Storage.Stores

		// Call EnsureStorageField
		config.EnsureStorageField()

		// Verify storage was not modified
		assert.Equal(t, originalBackends, config.Storage.Backends, "Backends should not be modified when already present")
		assert.Equal(t, originalStores, config.Storage.Stores, "Stores should not be modified when already present")
	})

	t.Run("should add storage field when backends are empty but stores exist", func(t *testing.T) {
		yamlWithPartialStorage := `
version: "2"
image_name: rh
apis:
  - inference
providers:
  inference: []
registered_resources:
  models: []
storage:
  backends: {}
  stores:
    custom_store:
      namespace: custom
      backend: custom_backend
`
		var config LlamaStackConfig
		err := config.FromYAML(yamlWithPartialStorage)
		require.NoError(t, err)

		// Verify backends are empty
		assert.Equal(t, 0, len(config.Storage.Backends))
		assert.Greater(t, len(config.Storage.Stores), 0)

		// Call EnsureStorageField
		config.EnsureStorageField()

		// Verify storage is populated with defaults (should replace partial storage)
		assert.Greater(t, len(config.Storage.Backends), 0, "Backends should be populated")
		assert.Greater(t, len(config.Storage.Stores), 0, "Stores should be populated")
	})

	t.Run("should add storage field when stores are empty but backends exist", func(t *testing.T) {
		yamlWithPartialStorage := `
version: "2"
image_name: rh
apis:
  - inference
providers:
  inference: []
registered_resources:
  models: []
storage:
  backends:
    custom_backend:
      type: custom
      path: /custom/path
  stores: {}
`
		var config LlamaStackConfig
		err := config.FromYAML(yamlWithPartialStorage)
		require.NoError(t, err)

		// Verify stores are empty
		assert.Greater(t, len(config.Storage.Backends), 0)
		assert.Equal(t, 0, len(config.Storage.Stores))

		// Call EnsureStorageField
		config.EnsureStorageField()

		// Verify storage is populated with defaults (should replace partial storage)
		assert.Greater(t, len(config.Storage.Backends), 0, "Backends should be populated")
		assert.Greater(t, len(config.Storage.Stores), 0, "Stores should be populated")
	})
}
