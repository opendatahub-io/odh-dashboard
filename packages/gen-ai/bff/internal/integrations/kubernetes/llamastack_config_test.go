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
	assert.Contains(t, yamlStr, "distro_name: rh")
	assert.Contains(t, yamlStr, "vector_stores:")
	assert.Contains(t, yamlStr, "default_provider_id: milvus")

	// Test JSON conversion
	jsonStr, err := config.ToJSON()
	assert.NoError(t, err)
	assert.Contains(t, jsonStr, "\"version\":\"2\"")
	assert.Contains(t, jsonStr, "\"distro_name\":\"rh\"")
	assert.Contains(t, jsonStr, "\"vector_stores\"")
	assert.Contains(t, jsonStr, "\"default_provider_id\":\"milvus\"")

	// Test parsing YAML
	var parsedConfig LlamaStackConfig
	err = parsedConfig.FromYAML(yamlStr)
	assert.NoError(t, err)
	assert.Equal(t, config.Version, parsedConfig.Version)
	assert.Equal(t, config.DistroName, parsedConfig.DistroName)
	assert.Equal(t, "milvus", parsedConfig.VectorStores.DefaultProviderID)
	assert.Equal(t, "sentence-transformers", parsedConfig.VectorStores.DefaultEmbeddingModel.ProviderID)
	assert.Equal(t, "ibm-granite/granite-embedding-125m-english", parsedConfig.VectorStores.DefaultEmbeddingModel.ModelID)

	// Test parsing JSON
	var parsedJSONConfig LlamaStackConfig
	err = parsedJSONConfig.FromJSON(jsonStr)
	assert.NoError(t, err)
	assert.Equal(t, config.Version, parsedJSONConfig.Version)
	assert.Equal(t, config.DistroName, parsedJSONConfig.DistroName)
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
	assert.NotEmpty(t, config.DistroName)
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

func TestRBACAuth_EnableRBACAuth(t *testing.T) {
	t.Run("should enable RBAC auth with default settings", func(t *testing.T) {
		config := NewDefaultLlamaStackConfig()

		// Verify auth is nil initially
		assert.Nil(t, config.Server.Auth)

		// Enable RBAC auth with defaults
		config.EnableRBACAuth("", "")

		// Verify auth is configured
		require.NotNil(t, config.Server.Auth)
		require.NotNil(t, config.Server.Auth.ProviderConfig)

		// Verify provider config
		assert.Equal(t, "kubernetes", config.Server.Auth.ProviderConfig.Type)
		assert.Contains(t, config.Server.Auth.ProviderConfig.APIServerURL, "kubernetes.default.svc")
		assert.True(t, config.Server.Auth.ProviderConfig.VerifyTLS)
		assert.Equal(t, "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt", config.Server.Auth.ProviderConfig.TLSCAFile)

		// Verify claims mapping
		assert.Equal(t, "roles", config.Server.Auth.ProviderConfig.ClaimsMapping["groups"])
		assert.Equal(t, "roles", config.Server.Auth.ProviderConfig.ClaimsMapping["username"])

		// Verify access policy
		require.Len(t, config.Server.Auth.AccessPolicy, 2)

		// Admin rule
		adminRule := config.Server.Auth.AccessPolicy[0]
		require.NotNil(t, adminRule.Permit)
		assert.ElementsMatch(t, []string{"create", "read", "delete"}, adminRule.Permit.Actions)
		assert.Equal(t, "user with admin in roles", adminRule.When)

		// System:authenticated rule
		authRule := config.Server.Auth.AccessPolicy[1]
		require.NotNil(t, authRule.Permit)
		assert.ElementsMatch(t, []string{"read"}, authRule.Permit.Actions)
		assert.Equal(t, "user with system:authenticated in roles", authRule.When)
	})

	t.Run("should enable RBAC auth with custom API server URL", func(t *testing.T) {
		config := NewDefaultLlamaStackConfig()
		customURL := "https://api.openshift.example.com:6443"

		config.EnableRBACAuth(customURL, "")

		require.NotNil(t, config.Server.Auth)
		assert.Equal(t, customURL, config.Server.Auth.ProviderConfig.APIServerURL)
	})

	t.Run("should enable RBAC auth with custom CA file", func(t *testing.T) {
		config := NewDefaultLlamaStackConfig()
		customCAFile := "/etc/ssl/certs/custom-ca.crt"

		config.EnableRBACAuth("", customCAFile)

		require.NotNil(t, config.Server.Auth)
		assert.Equal(t, customCAFile, config.Server.Auth.ProviderConfig.TLSCAFile)
	})
}

func TestRBACAuth_EnableRBACAuthWithCustomPolicy(t *testing.T) {
	t.Run("should enable RBAC auth with custom access policy", func(t *testing.T) {
		config := NewDefaultLlamaStackConfig()

		customPolicy := []AccessRule{
			{
				Permit: &Scope{
					Actions: []string{"create", "read", "update", "delete"},
				},
				When:        "user with superadmin in roles",
				Description: "superadmins have full access",
			},
			{
				Permit: &Scope{
					Actions:  []string{"read"},
					Resource: "model::*",
				},
				When:        "user with viewer in roles",
				Description: "viewers can only read models",
			},
		}

		config.EnableRBACAuthWithCustomPolicy("", "", customPolicy)

		require.NotNil(t, config.Server.Auth)
		require.Len(t, config.Server.Auth.AccessPolicy, 2)
		assert.Equal(t, "user with superadmin in roles", config.Server.Auth.AccessPolicy[0].When)
		assert.Equal(t, "model::*", config.Server.Auth.AccessPolicy[1].Permit.Resource)
	})
}

func TestRBACAuth_DisableRBACAuth(t *testing.T) {
	t.Run("should disable RBAC auth", func(t *testing.T) {
		config := NewDefaultLlamaStackConfig()

		// First enable RBAC auth
		config.EnableRBACAuth("", "")
		require.NotNil(t, config.Server.Auth)

		// Then disable it
		config.DisableRBACAuth()
		assert.Nil(t, config.Server.Auth)
	})
}

func TestRBACAuth_SetRoutePolicy(t *testing.T) {
	t.Run("should set route policy on config without auth", func(t *testing.T) {
		config := NewDefaultLlamaStackConfig()
		assert.Nil(t, config.Server.Auth)

		routePolicy := []RouteAccessRule{
			{
				Permit: &RouteScope{
					Paths: "/v1/chat/completions",
				},
				When:        "user with developer in roles",
				Description: "developers can access chat completions",
			},
		}

		config.SetRoutePolicy(routePolicy)

		require.NotNil(t, config.Server.Auth)
		require.Len(t, config.Server.Auth.RoutePolicy, 1)
		assert.Equal(t, "/v1/chat/completions", config.Server.Auth.RoutePolicy[0].Permit.Paths)
	})

	t.Run("should set route policy on config with existing auth", func(t *testing.T) {
		config := NewDefaultLlamaStackConfig()
		config.EnableRBACAuth("", "")

		routePolicy := []RouteAccessRule{
			{
				Permit: &RouteScope{
					Paths: []string{"/v1/files*", "/v1/models*"},
				},
				When:        "user with admin in roles",
				Description: "admins can access files and models routes",
			},
		}

		config.SetRoutePolicy(routePolicy)

		// Verify route policy is set
		require.Len(t, config.Server.Auth.RoutePolicy, 1)

		// Verify access policy is still intact
		require.Len(t, config.Server.Auth.AccessPolicy, 2)
	})
}

func TestRBACAuth_NewDefaultAccessPolicy(t *testing.T) {
	policy := NewDefaultAccessPolicy()

	require.Len(t, policy, 2)

	// Admin rule
	assert.NotNil(t, policy[0].Permit)
	assert.ElementsMatch(t, []string{"create", "read", "delete"}, policy[0].Permit.Actions)
	assert.Equal(t, "user with admin in roles", policy[0].When)

	// System:authenticated rule
	assert.NotNil(t, policy[1].Permit)
	assert.ElementsMatch(t, []string{"read"}, policy[1].Permit.Actions)
	assert.Equal(t, "user with system:authenticated in roles", policy[1].When)
}

func TestRBACAuth_NewAccessRule(t *testing.T) {
	rule := NewAccessRule([]string{"read", "update"}, "user with editor in roles", "editors can read and update")

	require.NotNil(t, rule.Permit)
	assert.ElementsMatch(t, []string{"read", "update"}, rule.Permit.Actions)
	assert.Equal(t, "user with editor in roles", rule.When)
	assert.Equal(t, "editors can read and update", rule.Description)
	assert.Nil(t, rule.Forbid)
}

func TestRBACAuth_NewForbidAccessRule(t *testing.T) {
	rule := NewForbidAccessRule([]string{"delete"}, "user with admin in roles", "only admins can delete")

	require.NotNil(t, rule.Forbid)
	assert.ElementsMatch(t, []string{"delete"}, rule.Forbid.Actions)
	assert.Equal(t, "user with admin in roles", rule.Unless)
	assert.Equal(t, "only admins can delete", rule.Description)
	assert.Nil(t, rule.Permit)
}

func TestRBACAuth_NewRouteAccessRule(t *testing.T) {
	t.Run("should create route access rule with single path", func(t *testing.T) {
		rule := NewRouteAccessRule("/v1/health", "user with authenticated in roles", "health endpoint")

		require.NotNil(t, rule.Permit)
		assert.Equal(t, "/v1/health", rule.Permit.Paths)
		assert.Equal(t, "user with authenticated in roles", rule.When)
		assert.Equal(t, "health endpoint", rule.Description)
	})

	t.Run("should create route access rule with multiple paths", func(t *testing.T) {
		paths := []string{"/v1/files*", "/v1/models*"}
		rule := NewRouteAccessRule(paths, "user with admin in roles", "admin routes")

		require.NotNil(t, rule.Permit)
		assert.Equal(t, paths, rule.Permit.Paths)
	})
}

func TestRBACAuth_Serialization(t *testing.T) {
	t.Run("should serialize auth config to YAML", func(t *testing.T) {
		config := NewDefaultLlamaStackConfig()
		config.EnableRBACAuth("", "")

		yamlStr, err := config.ToYAML()
		require.NoError(t, err)

		// Verify auth section is present in YAML
		assert.Contains(t, yamlStr, "auth:")
		assert.Contains(t, yamlStr, "provider_config:")
		assert.Contains(t, yamlStr, "type: kubernetes")
		assert.Contains(t, yamlStr, "api_server_url:")
		assert.Contains(t, yamlStr, "claims_mapping:")
		assert.Contains(t, yamlStr, "access_policy:")
		assert.Contains(t, yamlStr, "user with admin in roles")
		assert.Contains(t, yamlStr, "user with system:authenticated in roles")
	})

	t.Run("should serialize and deserialize auth config", func(t *testing.T) {
		config := NewDefaultLlamaStackConfig()
		config.EnableRBACAuth("https://api.cluster.example.com:6443", "/custom/ca.crt")

		yamlStr, err := config.ToYAML()
		require.NoError(t, err)

		// Parse back
		var parsedConfig LlamaStackConfig
		err = parsedConfig.FromYAML(yamlStr)
		require.NoError(t, err)

		// Verify auth config is preserved
		require.NotNil(t, parsedConfig.Server.Auth)
		require.NotNil(t, parsedConfig.Server.Auth.ProviderConfig)
		assert.Equal(t, "kubernetes", parsedConfig.Server.Auth.ProviderConfig.Type)
		assert.Equal(t, "https://api.cluster.example.com:6443", parsedConfig.Server.Auth.ProviderConfig.APIServerURL)
		assert.Equal(t, "/custom/ca.crt", parsedConfig.Server.Auth.ProviderConfig.TLSCAFile)
		assert.Len(t, parsedConfig.Server.Auth.AccessPolicy, 2)
	})

	t.Run("should serialize config without auth when not enabled", func(t *testing.T) {
		config := NewDefaultLlamaStackConfig()

		yamlStr, err := config.ToYAML()
		require.NoError(t, err)

		// Verify no auth section in YAML (should be omitted when nil)
		assert.NotContains(t, yamlStr, "provider_config:")
		assert.NotContains(t, yamlStr, "access_policy:")
	})
}

func TestRBACAuth_JSONSerialization(t *testing.T) {
	t.Run("should serialize auth config to JSON", func(t *testing.T) {
		config := NewDefaultLlamaStackConfig()
		config.EnableRBACAuth("", "")

		jsonStr, err := config.ToJSON()
		require.NoError(t, err)

		// Verify auth section is present in JSON
		assert.Contains(t, jsonStr, "\"auth\":")
		assert.Contains(t, jsonStr, "\"provider_config\":")
		assert.Contains(t, jsonStr, "\"type\":\"kubernetes\"")
		assert.Contains(t, jsonStr, "\"access_policy\":")
	})

	t.Run("should serialize and deserialize auth config via JSON", func(t *testing.T) {
		config := NewDefaultLlamaStackConfig()
		config.EnableRBACAuth("https://api.cluster.example.com:6443", "/custom/ca.crt")

		jsonStr, err := config.ToJSON()
		require.NoError(t, err)

		// Parse back
		var parsedConfig LlamaStackConfig
		err = parsedConfig.FromJSON(jsonStr)
		require.NoError(t, err)

		// Verify auth config is preserved
		require.NotNil(t, parsedConfig.Server.Auth)
		require.NotNil(t, parsedConfig.Server.Auth.ProviderConfig)
		assert.Equal(t, "kubernetes", parsedConfig.Server.Auth.ProviderConfig.Type)
		assert.Equal(t, "https://api.cluster.example.com:6443", parsedConfig.Server.Auth.ProviderConfig.APIServerURL)
	})
}

func TestRBACAuth_GeneratedConfigIncludesAuth(t *testing.T) {
	t.Run("should include RBAC auth in generated config matching install flow", func(t *testing.T) {
		// Simulate the generateLlamaStackConfig flow:
		// 1. Create default config
		// 2. EnsureStorageField
		// 3. EnableRBACAuth (the new addition)
		// 4. ToYAML
		config := NewDefaultLlamaStackConfig()
		config.EnsureStorageField()
		config.EnableRBACAuth("", "")

		yamlStr, err := config.ToYAML()
		require.NoError(t, err)

		// Verify the auth section is present in the generated YAML
		assert.Contains(t, yamlStr, "auth:")
		assert.Contains(t, yamlStr, "provider_config:")
		assert.Contains(t, yamlStr, "type: kubernetes")
		assert.Contains(t, yamlStr, "api_server_url:")
		assert.Contains(t, yamlStr, "kubernetes.default.svc")
		assert.Contains(t, yamlStr, "verify_tls: true")
		assert.Contains(t, yamlStr, "claims_mapping:")
		assert.Contains(t, yamlStr, "groups: roles")
		assert.Contains(t, yamlStr, "username: roles")
		assert.Contains(t, yamlStr, "access_policy:")
		assert.Contains(t, yamlStr, "user with admin in roles")
		assert.Contains(t, yamlStr, "user with system:authenticated in roles")

		// Verify the rest of the config is still intact
		assert.Contains(t, yamlStr, "version:")
		assert.Contains(t, yamlStr, "providers:")
		assert.Contains(t, yamlStr, "port: 8321")
	})

	t.Run("should produce config parseable by LlamaStack with auth section", func(t *testing.T) {
		config := NewDefaultLlamaStackConfig()
		config.EnsureStorageField()
		config.EnableRBACAuth("", "")

		yamlStr, err := config.ToYAML()
		require.NoError(t, err)

		// Verify round-trip: parse back and check auth is preserved
		var parsedConfig LlamaStackConfig
		err = parsedConfig.FromYAML(yamlStr)
		require.NoError(t, err)

		// Auth must be present after round-trip
		require.NotNil(t, parsedConfig.Server.Auth)
		require.NotNil(t, parsedConfig.Server.Auth.ProviderConfig)
		assert.Equal(t, "kubernetes", parsedConfig.Server.Auth.ProviderConfig.Type)
		assert.True(t, parsedConfig.Server.Auth.ProviderConfig.VerifyTLS)

		// Access policies must be preserved
		require.Len(t, parsedConfig.Server.Auth.AccessPolicy, 2)

		// Admin rule: create, read, delete
		adminRule := parsedConfig.Server.Auth.AccessPolicy[0]
		require.NotNil(t, adminRule.Permit)
		assert.ElementsMatch(t, []string{"create", "read", "delete"}, adminRule.Permit.Actions)
		assert.Equal(t, "user with admin in roles", adminRule.When)

		// Authenticated rule: read-only
		authRule := parsedConfig.Server.Auth.AccessPolicy[1]
		require.NotNil(t, authRule.Permit)
		assert.ElementsMatch(t, []string{"read"}, authRule.Permit.Actions)
		assert.Equal(t, "user with system:authenticated in roles", authRule.When)

		// Server port and other fields must remain intact
		assert.Equal(t, 8321, parsedConfig.Server.Port)
		assert.Equal(t, "2", parsedConfig.Version)
	})
}

func TestEnsureStorageField(t *testing.T) {
	t.Run("should add storage field when missing", func(t *testing.T) {
		yamlWithoutStorage := `
version: "2"
distro_name: rh
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
distro_name: rh
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
distro_name: rh
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
distro_name: rh
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

func TestAddVLLMProviderAndModel_WithMaxTokens(t *testing.T) {
	t.Run("should include max_tokens in model configuration when provided", func(t *testing.T) {
		config := NewDefaultLlamaStackConfig()
		maxTokens := 8192
		config.AddVLLMProviderAndModel("test-provider", "https://test.com/v1", 0, "test-model", "llm", nil, &maxTokens)

		yamlStr, err := config.ToYAML()
		require.NoError(t, err)

		// Verify max_tokens is in the YAML
		assert.Contains(t, yamlStr, "max_tokens: 8192")

		// Parse back and verify
		var parsedConfig LlamaStackConfig
		err = parsedConfig.FromYAML(yamlStr)
		require.NoError(t, err)

		// Find the model we added
		var foundModel *Model
		for i := range parsedConfig.RegisteredResources.Models {
			if parsedConfig.RegisteredResources.Models[i].ModelID == "test-model" {
				foundModel = &parsedConfig.RegisteredResources.Models[i]
				break
			}
		}
		require.NotNil(t, foundModel, "Model should be found in parsed config")
		assert.NotNil(t, foundModel.MaxTokens, "MaxTokens should be set")
		assert.Equal(t, 8192, *foundModel.MaxTokens)
	})

	t.Run("should not include max_tokens in model configuration when not provided", func(t *testing.T) {
		config := NewDefaultLlamaStackConfig()
		config.AddVLLMProviderAndModel("test-provider", "https://test.com/v1", 0, "test-model", "llm", nil, nil)

		yamlStr, err := config.ToYAML()
		require.NoError(t, err)

		// Parse back and verify
		var parsedConfig LlamaStackConfig
		err = parsedConfig.FromYAML(yamlStr)
		require.NoError(t, err)

		// Find the model we added
		var foundModel *Model
		for i := range parsedConfig.RegisteredResources.Models {
			if parsedConfig.RegisteredResources.Models[i].ModelID == "test-model" {
				foundModel = &parsedConfig.RegisteredResources.Models[i]
				break
			}
		}
		require.NotNil(t, foundModel, "Model should be found in parsed config")
		assert.Nil(t, foundModel.MaxTokens, "MaxTokens should be nil when not provided")
	})

	t.Run("should support multiple models with different max_tokens values", func(t *testing.T) {
		config := NewDefaultLlamaStackConfig()
		maxTokens1 := 4096
		maxTokens2 := 16384
		config.AddVLLMProviderAndModel("test-provider-1", "https://test1.com/v1", 0, "test-model-1", "llm", nil, &maxTokens1)
		config.AddVLLMProviderAndModel("test-provider-2", "https://test2.com/v1", 1, "test-model-2", "llm", nil, &maxTokens2)

		yamlStr, err := config.ToYAML()
		require.NoError(t, err)

		// Verify both max_tokens values are in the YAML
		assert.Contains(t, yamlStr, "max_tokens: 4096")
		assert.Contains(t, yamlStr, "max_tokens: 16384")

		// Parse back and verify
		var parsedConfig LlamaStackConfig
		err = parsedConfig.FromYAML(yamlStr)
		require.NoError(t, err)

		// Find both models
		model1Found := false
		model2Found := false
		for i := range parsedConfig.RegisteredResources.Models {
			model := &parsedConfig.RegisteredResources.Models[i]
			if model.ModelID == "test-model-1" {
				model1Found = true
				assert.NotNil(t, model.MaxTokens)
				assert.Equal(t, 4096, *model.MaxTokens)
			}
			if model.ModelID == "test-model-2" {
				model2Found = true
				assert.NotNil(t, model.MaxTokens)
				assert.Equal(t, 16384, *model.MaxTokens)
			}
		}
		assert.True(t, model1Found, "Model 1 should be found")
		assert.True(t, model2Found, "Model 2 should be found")
	})
}
