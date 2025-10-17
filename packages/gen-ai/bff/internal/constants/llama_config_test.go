package constants

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"gopkg.in/yaml.v2"
)

func TestLlamaStackConfig_Conversions(t *testing.T) {
	config := NewDefaultLlamaStackConfig()

	// Test YAML conversion
	yamlStr, err := config.ToYAML()
	assert.NoError(t, err)
	assert.Contains(t, yamlStr, "version: \"2\"")
	assert.Contains(t, yamlStr, "image_name: rh")

	// Test JSON conversion
	jsonStr, err := config.ToJSON()
	assert.NoError(t, err)
	assert.Contains(t, jsonStr, "\"version\":\"2\"")
	assert.Contains(t, jsonStr, "\"image_name\":\"rh\"")

	// Test parsing YAML
	var parsedConfig LlamaStackConfig
	err = parsedConfig.FromYAML(yamlStr)
	assert.NoError(t, err)
	assert.Equal(t, config.Version, parsedConfig.Version)
	assert.Equal(t, config.ImageName, parsedConfig.ImageName)

	// Test parsing JSON
	var parsedJSONConfig LlamaStackConfig
	err = parsedJSONConfig.FromJSON(jsonStr)
	assert.NoError(t, err)
	assert.Equal(t, config.Version, parsedJSONConfig.Version)
	assert.Equal(t, config.ImageName, parsedJSONConfig.ImageName)
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
	assert.Equal(t, "http://example.com", provider2.Config["url"])

	// Test NewSentenceTransformerProvider
	provider3 := NewSentenceTransformerProvider()
	assert.Equal(t, "sentence-transformers", provider3.ProviderID)
	assert.Equal(t, "inline::sentence-transformers", provider3.ProviderType)
	assert.Equal(t, EmptyConfig(), provider3.Config)

	// Test NewVLLMProvider
	provider4 := NewVLLMProvider("vllm-1", "http://vllm.example.com")
	assert.Equal(t, "vllm-1", provider4.ProviderID)
	assert.Equal(t, "remote::vllm", provider4.ProviderType)
	assert.Equal(t, "http://vllm.example.com", provider4.Config["url"])

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
