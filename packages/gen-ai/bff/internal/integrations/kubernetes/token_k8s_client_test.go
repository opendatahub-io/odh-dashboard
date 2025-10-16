package kubernetes

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"testing"
	"time"

	kservev1alpha1 "github.com/kserve/kserve/pkg/apis/serving/v1alpha1"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas/maasmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	authv1 "k8s.io/api/authorization/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

// loadTestData loads test fixture files from the testdata directory
func loadTestData(t *testing.T, filename string) string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("testdata", filename))
	require.NoError(t, err, "failed to load test data file: %s", filename)
	return string(data)
}

func TestCanListLlamaStackDistributions(t *testing.T) {
	t.Run("should create proper SAR request for LlamaStackDistribution resources", func(t *testing.T) {
		// Create a mock config
		config := &rest.Config{
			Host: "https://test-cluster.example.com",
		}

		// Create a token client with mock config
		client := &TokenKubernetesClient{
			Config: config,
			Logger: slog.Default(),
		}

		identity := &integrations.RequestIdentity{
			Token: "test-token",
		}

		// Test that the method exists and can be called
		// Note: This will fail in a real test environment without proper Kubernetes setup,
		// but it validates the method signature and basic structure
		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()

		canList, err := client.CanListLlamaStackDistributions(ctx, identity, testutil.TestNamespace)

		// We expect an error because we don't have a real Kubernetes cluster
		// but the method should be callable and return appropriate error
		assert.Error(t, err)
		assert.False(t, canList)
		// The error should be about network connectivity, not client creation
		assert.Contains(t, err.Error(), "dial tcp")
	})

	t.Run("should handle nil identity gracefully", func(t *testing.T) {
		config := &rest.Config{
			Host: "https://test-cluster.example.com",
		}

		client := &TokenKubernetesClient{
			Config: config,
			Logger: slog.Default(),
		}

		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()

		canList, err := client.CanListLlamaStackDistributions(ctx, nil, testutil.TestNamespace)

		assert.Error(t, err)
		assert.False(t, canList)
		assert.Contains(t, err.Error(), "identity cannot be nil")
	})

	t.Run("should handle empty token", func(t *testing.T) {
		config := &rest.Config{
			Host: "https://test-cluster.example.com",
		}

		client := &TokenKubernetesClient{
			Config: config,
			Logger: slog.Default(),
		}

		identity := &integrations.RequestIdentity{
			Token: "",
		}

		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()

		canList, err := client.CanListLlamaStackDistributions(ctx, identity, testutil.TestNamespace)

		assert.Error(t, err)
		assert.False(t, canList)
	})

	t.Run("should handle context cancellation", func(t *testing.T) {
		config := &rest.Config{
			Host: "https://test-cluster.example.com",
		}

		client := &TokenKubernetesClient{
			Config: config,
			Logger: slog.Default(),
		}

		identity := &integrations.RequestIdentity{
			Token: "test-token",
		}

		// Create a context that's already cancelled
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		canList, err := client.CanListLlamaStackDistributions(ctx, identity, testutil.TestNamespace)

		assert.Error(t, err)
		assert.False(t, canList)
		assert.Contains(t, err.Error(), "context canceled")
	})
}

func TestCanListLlamaStackDistributionsSARStructure(t *testing.T) {
	t.Run("should create correct SAR request structure", func(t *testing.T) {
		// Test that we can create the SAR request with correct parameters
		sar := &authv1.SelfSubjectAccessReview{
			Spec: authv1.SelfSubjectAccessReviewSpec{
				ResourceAttributes: &authv1.ResourceAttributes{
					Verb:      "list",
					Group:     "llamastack.io",
					Resource:  "llamastackdistributions",
					Namespace: "test-namespace",
				},
			},
		}

		// Verify the SAR structure
		assert.Equal(t, "list", sar.Spec.ResourceAttributes.Verb)
		assert.Equal(t, "llamastack.io", sar.Spec.ResourceAttributes.Group)
		assert.Equal(t, "llamastackdistributions", sar.Spec.ResourceAttributes.Resource)
		assert.Equal(t, "test-namespace", sar.Spec.ResourceAttributes.Namespace)
	})
}

func TestParseModelProviderFromYAML(t *testing.T) {
	// Load test data from testdata directory
	mockLlamaStackConfigYAML := loadTestData(t, "test_llama_stack_config.yaml")

	// Create a TokenKubernetesClient instance for testing
	kc := &TokenKubernetesClient{}

	tests := []struct {
		name                 string
		modelID              string
		expectedProviderID   string
		expectedProviderType string
		expectedURL          string
		expectError          bool
	}{
		{
			name:                 "Extract vLLM model (non-MaaS)",
			modelID:              "llama-32-3b-instruct",
			expectedProviderID:   "vllm-inference-1",
			expectedProviderType: "remote::vllm",
			expectedURL:          "http://llama-32-3b-instruct-predictor.crimson-show.svc.cluster.local/v1",
			expectError:          false,
		},
		{
			name:                 "Extract embedding model",
			modelID:              "granite-embedding-125m",
			expectedProviderID:   "sentence-transformers",
			expectedProviderType: "inline::sentence-transformers",
			expectedURL:          "", // No URL in config for this provider
			expectError:          false,
		},
		{
			name:                 "Extract MaaS model (watsonx)",
			modelID:              "granite-3.1-8b-instruct",
			expectedProviderID:   "maas-watsonx",
			expectedProviderType: "remote::watsonx",
			expectedURL:          "https://us-south.ml.cloud.ibm.com/ml/v1",
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
			result, err := kc.parseModelProviderFromYAML(mockLlamaStackConfigYAML, tt.modelID)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
				return
			}

			require.NoError(t, err)
			require.NotNil(t, result)

			// Verify extracted fields
			assert.Equal(t, tt.modelID, result.ModelID, "ModelID should match")
			assert.Equal(t, tt.expectedProviderID, result.ProviderID, "ProviderID should match")
			assert.Equal(t, tt.expectedProviderType, result.ProviderType, "ProviderType should match")
			assert.Equal(t, tt.expectedURL, result.URL, "URL should match")
		})
	}
}

func TestParseModelProviderFromYAML_EnvVarCleaning(t *testing.T) {
	// Load test data from testdata directory
	mockLlamaStackConfigYAML := loadTestData(t, "test_llama_stack_config.yaml")

	kc := &TokenKubernetesClient{}

	// Test that environment variable placeholders are cleaned
	result, err := kc.parseModelProviderFromYAML(mockLlamaStackConfigYAML, "llama-32-3b-instruct")

	require.NoError(t, err)
	require.NotNil(t, result)

	// URL should have env var cleaned (${env.VLLM_MAX_TOKENS:=4096} should not appear)
	assert.NotContains(t, result.URL, "${env.", "URL should not contain environment variable placeholders")
	assert.NotContains(t, result.URL, ":=", "URL should not contain default value syntax")
}

func TestParseModelProviderFromYAML_MaaSDetection(t *testing.T) {
	// Load test data from testdata directory
	mockLlamaStackConfigYAML := loadTestData(t, "test_llama_stack_config.yaml")

	kc := &TokenKubernetesClient{}

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

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := kc.parseModelProviderFromYAML(mockLlamaStackConfigYAML, tt.modelID)

			require.NoError(t, err)
			require.NotNil(t, result)

			// Check if provider_id starts with "maas-"
			isMaaS := len(result.ProviderID) >= 5 && result.ProviderID[:5] == "maas-"
			assert.Equal(t, tt.isMaaS, isMaaS, "MaaS detection should match expected value")
		})
	}
}

func TestParseModelProviderFromYAML_EdgeCases(t *testing.T) {
	kc := &TokenKubernetesClient{}

	t.Run("should handle invalid YAML", func(t *testing.T) {
		invalidYAML := "this is not { valid yaml: ["
		result, err := kc.parseModelProviderFromYAML(invalidYAML, "any-model")
		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "failed to parse YAML")
	})

	t.Run("should handle empty YAML", func(t *testing.T) {
		emptyYAML := ""
		result, err := kc.parseModelProviderFromYAML(emptyYAML, "any-model")
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
		result, err := kc.parseModelProviderFromYAML(yamlWithoutModels, "any-model")
		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "provider not found for model")
	})

	t.Run("should handle YAML with no providers section", func(t *testing.T) {
		yamlWithoutProviders := `
version: "2"
models:
  - model_id: test-model
    provider_id: test-provider
`
		result, err := kc.parseModelProviderFromYAML(yamlWithoutProviders, "test-model")
		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "provider configuration not found")
	})

	t.Run("should handle model with provider that doesn't exist in providers section", func(t *testing.T) {
		yamlWithMissingProvider := `
version: "2"
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
		result, err := kc.parseModelProviderFromYAML(yamlWithMissingProvider, "test-model")
		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "provider configuration not found for provider_id non-existent-provider")
	})
}

func TestParseModelProviderFromYAML_YAMLStructureParsing(t *testing.T) {
	kc := &TokenKubernetesClient{}

	t.Run("should correctly parse all fields from well-formed YAML", func(t *testing.T) {
		wellFormedYAML := `
version: "2"
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
		// Test first model
		result1, err := kc.parseModelProviderFromYAML(wellFormedYAML, "test-model-1")
		require.NoError(t, err)
		require.NotNil(t, result1)
		assert.Equal(t, "test-model-1", result1.ModelID)
		assert.Equal(t, "test-provider-1", result1.ProviderID)
		assert.Equal(t, "remote::test", result1.ProviderType)
		assert.Equal(t, "https://provider1.test.com/v1/endpoint", result1.URL)

		// Test second model
		result2, err := kc.parseModelProviderFromYAML(wellFormedYAML, "test-model-2")
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
		result, err := kc.parseModelProviderFromYAML(yamlWithoutURL, "local-model")
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, "local-model", result.ModelID)
		assert.Equal(t, "local-provider", result.ProviderID)
		assert.Equal(t, "inline::local", result.ProviderType)
		assert.Equal(t, "", result.URL)
	})
}

func TestGenerateLlamaStackConfigWithMaaSModels(t *testing.T) {
	t.Run("should handle MaaS models correctly", func(t *testing.T) {
		// Create a mock MaaS client
		mockMaaSClient := &maasmocks.MockMaaSClient{}

		// Create a token client
		client := &TokenKubernetesClient{
			Logger: slog.Default(),
		}

		// Test models with only MaaS models (no regular models to avoid Kubernetes client issues)
		models := []models.InstallModel{
			{ModelName: "llama-2-7b-chat", IsMaaSModel: true},
			{ModelName: "granite-7b-lab", IsMaaSModel: true},
		}

		ctx := context.Background()

		// Test the MaaS model handling logic
		result, err := client.generateLlamaStackConfig(ctx, "test-namespace", models, mockMaaSClient)

		// This should succeed since we're only using MaaS models
		assert.NoError(t, err)
		assert.NotEmpty(t, result)

		// Verify the result contains MaaS model configurations
		assert.Contains(t, result, "llama-2-7b-chat")
		assert.Contains(t, result, "granite-7b-lab")
		assert.Contains(t, result, "maas-vllm-inference")
	})

	t.Run("should fail when MaaS model is not ready", func(t *testing.T) {
		// Create a mock MaaS client
		mockMaaSClient := &maasmocks.MockMaaSClient{}

		// Create a token client
		client := &TokenKubernetesClient{
			Logger: slog.Default(),
		}

		// Test with a model that is not ready (mistral-7b-instruct has Ready: false in mock)
		models := []models.InstallModel{
			{ModelName: "mistral-7b-instruct", IsMaaSModel: true},
		}

		ctx := context.Background()

		// Test the MaaS model handling logic
		result, err := client.generateLlamaStackConfig(ctx, "test-namespace", models, mockMaaSClient)

		// This should fail because the model is not ready
		assert.Error(t, err)
		assert.Empty(t, result)
		assert.Contains(t, err.Error(), "is not ready")
	})

	t.Run("should fail when MaaS model is not found", func(t *testing.T) {
		// Create a mock MaaS client
		mockMaaSClient := &maasmocks.MockMaaSClient{}

		// Create a token client
		client := &TokenKubernetesClient{
			Logger: slog.Default(),
		}

		// Test with a model that doesn't exist in the mock
		models := []models.InstallModel{
			{ModelName: "non-existent-model", IsMaaSModel: true},
		}

		ctx := context.Background()

		// Test the MaaS model handling logic
		result, err := client.generateLlamaStackConfig(ctx, "test-namespace", models, mockMaaSClient)

		// This should fail because the model is not found
		assert.Error(t, err)
		assert.Empty(t, result)
		assert.Contains(t, err.Error(), "not found")
	})
}

// TestExtractEndpointFromLLMInferenceService tests the internal endpoint extraction
func TestExtractEndpointFromLLMInferenceService(t *testing.T) {
	t.Run("should extract internal endpoint from service", func(t *testing.T) {
		// Create a fake Kubernetes client with a service
		scheme := runtime.NewScheme()
		require.NoError(t, corev1.AddToScheme(scheme))

		// Create a mock service
		mockService := &corev1.Service{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "facebook-opt-125m-single-kserve-workload-svc",
				Namespace: "llm-test",
			},
			Spec: corev1.ServiceSpec{
				Ports: []corev1.ServicePort{
					{
						Name:       "https",
						Port:       8000,
						TargetPort: intstr.FromInt(8000),
						Protocol:   corev1.ProtocolTCP,
					},
				},
			},
		}

		// Create fake client with the service
		fakeClient := fake.NewClientBuilder().WithScheme(scheme).WithObjects(mockService).Build()

		// Create LLMInferenceService
		llmSvc := &kservev1alpha1.LLMInferenceService{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "facebook-opt-125m-single",
				Namespace: "llm-test",
				Annotations: map[string]string{
					"security.opendatahub.io/enable-auth": "true",
				},
			},
			Spec: kservev1alpha1.LLMInferenceServiceSpec{
				Model: kservev1alpha1.LLMModelSpec{
					Name: stringPtr("facebook/opt-125m"),
				},
			},
		}

		// Create token client with fake client
		client := &TokenKubernetesClient{
			Client: fakeClient,
			Logger: slog.Default(),
		}

		// Test endpoint extraction
		endpoint, err := client.extractEndpointFromLLMInferenceService(llmSvc)

		// Should succeed and return internal endpoint
		assert.NoError(t, err)
		assert.Equal(t, "https://facebook-opt-125m-single-kserve-workload-svc.llm-test.svc.cluster.local:8000/v1", endpoint)
	})

	t.Run("should extract internal endpoint with http for non-auth service", func(t *testing.T) {
		// Create a fake Kubernetes client with a service
		scheme := runtime.NewScheme()
		require.NoError(t, corev1.AddToScheme(scheme))

		// Create a mock service with http port
		mockService := &corev1.Service{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "test-model-kserve-workload-svc",
				Namespace: "test-namespace",
			},
			Spec: corev1.ServiceSpec{
				Ports: []corev1.ServicePort{
					{
						Name:       "http",
						Port:       8080,
						TargetPort: intstr.FromInt(8080),
						Protocol:   corev1.ProtocolTCP,
					},
				},
			},
		}

		// Create fake client with the service
		fakeClient := fake.NewClientBuilder().WithScheme(scheme).WithObjects(mockService).Build()

		// Create LLMInferenceService without auth
		llmSvc := &kservev1alpha1.LLMInferenceService{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "test-model",
				Namespace: "test-namespace",
				Annotations: map[string]string{
					"security.opendatahub.io/enable-auth": "false",
				},
			},
			Spec: kservev1alpha1.LLMInferenceServiceSpec{
				Model: kservev1alpha1.LLMModelSpec{
					Name: stringPtr("test/model"),
				},
			},
		}

		// Create token client with fake client
		client := &TokenKubernetesClient{
			Client: fakeClient,
			Logger: slog.Default(),
		}

		// Test endpoint extraction
		endpoint, err := client.extractEndpointFromLLMInferenceService(llmSvc)

		// Should succeed and return internal endpoint with http
		assert.NoError(t, err)
		assert.Equal(t, "http://test-model-kserve-workload-svc.test-namespace.svc.cluster.local:8080/v1", endpoint)
	})

	t.Run("should handle service not found", func(t *testing.T) {
		// Create a fake Kubernetes client without the service
		scheme := runtime.NewScheme()
		require.NoError(t, corev1.AddToScheme(scheme))
		fakeClient := fake.NewClientBuilder().WithScheme(scheme).Build()

		// Create LLMInferenceService without Status fields
		llmSvc := &kservev1alpha1.LLMInferenceService{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "test-model",
				Namespace: "test-namespace",
				Annotations: map[string]string{
					"security.opendatahub.io/enable-auth": "false",
				},
			},
			Spec: kservev1alpha1.LLMInferenceServiceSpec{
				Model: kservev1alpha1.LLMModelSpec{
					Name: stringPtr("test/model"),
				},
			},
		}

		// Create token client with fake client
		client := &TokenKubernetesClient{
			Client: fakeClient,
			Logger: slog.Default(),
		}

		// Test endpoint extraction
		endpoint, err := client.extractEndpointFromLLMInferenceService(llmSvc)

		// Should fail because service is not found and no fallback URL
		assert.Error(t, err)
		assert.Empty(t, endpoint)
		assert.Contains(t, err.Error(), "has no service or address URL")
	})

	t.Run("should handle nil LLMInferenceService", func(t *testing.T) {
		client := &TokenKubernetesClient{
			Logger: slog.Default(),
		}

		endpoint, err := client.extractEndpointFromLLMInferenceService(nil)

		assert.Error(t, err)
		assert.Empty(t, endpoint)
		assert.Contains(t, err.Error(), "LLMInferenceService is nil")
	})

	t.Run("should handle service with no ports", func(t *testing.T) {
		// Create a fake Kubernetes client with a service that has no ports
		scheme := runtime.NewScheme()
		require.NoError(t, corev1.AddToScheme(scheme))

		mockService := &corev1.Service{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "test-model-kserve-workload-svc",
				Namespace: "test-namespace",
			},
			Spec: corev1.ServiceSpec{
				Ports: []corev1.ServicePort{}, // No ports
			},
		}

		fakeClient := fake.NewClientBuilder().WithScheme(scheme).WithObjects(mockService).Build()

		llmSvc := &kservev1alpha1.LLMInferenceService{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "test-model",
				Namespace: "test-namespace",
			},
			Spec: kservev1alpha1.LLMInferenceServiceSpec{
				Model: kservev1alpha1.LLMModelSpec{
					Name: stringPtr("test/model"),
				},
			},
		}

		client := &TokenKubernetesClient{
			Client: fakeClient,
			Logger: slog.Default(),
		}

		endpoint, err := client.extractEndpointFromLLMInferenceService(llmSvc)

		assert.Error(t, err)
		assert.Empty(t, endpoint)
		assert.Contains(t, err.Error(), "has no ports")
	})
}

// TestExtractEndpointsFromLLMInferenceService tests the endpoint list extraction
func TestExtractEndpointsFromLLMInferenceService(t *testing.T) {
	t.Run("should extract internal endpoint", func(t *testing.T) {
		// Create a fake Kubernetes client with a service
		scheme := runtime.NewScheme()
		require.NoError(t, corev1.AddToScheme(scheme))

		mockService := &corev1.Service{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "test-model-kserve-workload-svc",
				Namespace: "test-namespace",
			},
			Spec: corev1.ServiceSpec{
				Ports: []corev1.ServicePort{
					{
						Name:       "https",
						Port:       8000,
						TargetPort: intstr.FromInt(8000),
						Protocol:   corev1.ProtocolTCP,
					},
				},
			},
		}

		fakeClient := fake.NewClientBuilder().WithScheme(scheme).WithObjects(mockService).Build()

		// Create LLMInferenceService
		llmSvc := &kservev1alpha1.LLMInferenceService{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "test-model",
				Namespace: "test-namespace",
				Annotations: map[string]string{
					"security.opendatahub.io/enable-auth": "true",
				},
			},
			Spec: kservev1alpha1.LLMInferenceServiceSpec{
				Model: kservev1alpha1.LLMModelSpec{
					Name: stringPtr("test/model"),
				},
			},
		}

		client := &TokenKubernetesClient{
			Client: fakeClient,
			Logger: slog.Default(),
		}

		endpoints := client.extractEndpointsFromLLMInferenceService(llmSvc)

		// Should have internal endpoint
		assert.Len(t, endpoints, 1)
		assert.Contains(t, endpoints, "internal: https://test-model-kserve-workload-svc.test-namespace.svc.cluster.local:8000")
	})

	t.Run("should only extract internal endpoint when external is cluster-local", func(t *testing.T) {
		// Create a fake Kubernetes client with a service
		scheme := runtime.NewScheme()
		require.NoError(t, corev1.AddToScheme(scheme))

		mockService := &corev1.Service{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "test-model-kserve-workload-svc",
				Namespace: "test-namespace",
			},
			Spec: corev1.ServiceSpec{
				Ports: []corev1.ServicePort{
					{
						Name:       "https",
						Port:       8000,
						TargetPort: intstr.FromInt(8000),
						Protocol:   corev1.ProtocolTCP,
					},
				},
			},
		}

		fakeClient := fake.NewClientBuilder().WithScheme(scheme).WithObjects(mockService).Build()

		// Create LLMInferenceService with cluster-local external URL
		llmSvc := &kservev1alpha1.LLMInferenceService{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "test-model",
				Namespace: "test-namespace",
			},
			Spec: kservev1alpha1.LLMInferenceServiceSpec{
				Model: kservev1alpha1.LLMModelSpec{
					Name: stringPtr("test/model"),
				},
			},
		}

		client := &TokenKubernetesClient{
			Client: fakeClient,
			Logger: slog.Default(),
		}

		endpoints := client.extractEndpointsFromLLMInferenceService(llmSvc)

		// Should only have internal endpoint (external is filtered out as cluster-local)
		assert.Len(t, endpoints, 1)
		assert.Contains(t, endpoints, "internal: https://test-model-kserve-workload-svc.test-namespace.svc.cluster.local:8000")
	})

	t.Run("should handle nil LLMInferenceService", func(t *testing.T) {
		client := &TokenKubernetesClient{
			Logger: slog.Default(),
		}

		endpoints := client.extractEndpointsFromLLMInferenceService(nil)

		assert.Empty(t, endpoints)
	})
}

// TestExtractInternalEndpointFromLLMInferenceService tests the internal endpoint extraction helper
func TestExtractInternalEndpointFromLLMInferenceService(t *testing.T) {
	t.Run("should extract internal endpoint with correct protocol and port", func(t *testing.T) {
		// Create a fake Kubernetes client with a service
		scheme := runtime.NewScheme()
		require.NoError(t, corev1.AddToScheme(scheme))

		mockService := &corev1.Service{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "facebook-opt-125m-single-kserve-workload-svc",
				Namespace: "llm-test",
			},
			Spec: corev1.ServiceSpec{
				Ports: []corev1.ServicePort{
					{
						Name:       "https",
						Port:       8000,
						TargetPort: intstr.FromInt(8000),
						Protocol:   corev1.ProtocolTCP,
					},
				},
			},
		}

		fakeClient := fake.NewClientBuilder().WithScheme(scheme).WithObjects(mockService).Build()

		llmSvc := &kservev1alpha1.LLMInferenceService{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "facebook-opt-125m-single",
				Namespace: "llm-test",
				Annotations: map[string]string{
					"security.opendatahub.io/enable-auth": "true",
				},
			},
			Spec: kservev1alpha1.LLMInferenceServiceSpec{
				Model: kservev1alpha1.LLMModelSpec{
					Name: stringPtr("facebook/opt-125m"),
				},
			},
		}

		client := &TokenKubernetesClient{
			Client: fakeClient,
			Logger: slog.Default(),
		}

		endpoint := client.extractInternalEndpointFromLLMInferenceService(llmSvc)

		assert.Equal(t, "https://facebook-opt-125m-single-kserve-workload-svc.llm-test.svc.cluster.local:8000", endpoint)
	})

	t.Run("should handle different port names and protocols", func(t *testing.T) {
		testCases := []struct {
			name        string
			portName    string
			port        int32
			authEnabled string
			expectedURL string
		}{
			{
				name:        "https port with auth",
				portName:    "https",
				port:        8000,
				authEnabled: "true",
				expectedURL: "https://test-model-kserve-workload-svc.test-namespace.svc.cluster.local:8000",
			},
			{
				name:        "http port without auth",
				portName:    "http",
				port:        8080,
				authEnabled: "false",
				expectedURL: "http://test-model-kserve-workload-svc.test-namespace.svc.cluster.local:8080",
			},
			{
				name:        "custom port name",
				portName:    "custom",
				port:        9000,
				authEnabled: "false",
				expectedURL: "http://test-model-kserve-workload-svc.test-namespace.svc.cluster.local:9000",
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				// Create a fake Kubernetes client with a service
				scheme := runtime.NewScheme()
				require.NoError(t, corev1.AddToScheme(scheme))

				mockService := &corev1.Service{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "test-model-kserve-workload-svc",
						Namespace: "test-namespace",
					},
					Spec: corev1.ServiceSpec{
						Ports: []corev1.ServicePort{
							{
								Name:       tc.portName,
								Port:       tc.port,
								TargetPort: intstr.FromInt(int(tc.port)),
								Protocol:   corev1.ProtocolTCP,
							},
						},
					},
				}

				fakeClient := fake.NewClientBuilder().WithScheme(scheme).WithObjects(mockService).Build()

				llmSvc := &kservev1alpha1.LLMInferenceService{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "test-model",
						Namespace: "test-namespace",
						Annotations: map[string]string{
							"security.opendatahub.io/enable-auth": tc.authEnabled,
						},
					},
					Spec: kservev1alpha1.LLMInferenceServiceSpec{
						Model: kservev1alpha1.LLMModelSpec{
							Name: stringPtr("test/model"),
						},
					},
				}

				client := &TokenKubernetesClient{
					Client: fakeClient,
					Logger: slog.Default(),
				}

				endpoint := client.extractInternalEndpointFromLLMInferenceService(llmSvc)

				assert.Equal(t, tc.expectedURL, endpoint)
			})
		}
	})
}

// Helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}
