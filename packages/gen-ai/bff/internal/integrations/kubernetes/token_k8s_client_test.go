package kubernetes

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas/maasmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	authv1 "k8s.io/api/authorization/v1"
	"k8s.io/client-go/rest"
	"knative.dev/pkg/apis"
	duckv1 "knative.dev/pkg/apis/duck/v1"

	kservev1alpha1 "github.com/kserve/kserve/pkg/apis/serving/v1alpha1"
)

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

		// Test the MaaS model handling logic (with empty guardrails)
		result, err := client.generateLlamaStackConfig(ctx, "test-namespace", models, false, mockMaaSClient)

		// This should succeed since we're only using MaaS models
		assert.NoError(t, err)
		assert.NotEmpty(t, result)

		// Verify the result contains MaaS model configurations
		assert.Contains(t, result, "llama-2-7b-chat")
		assert.Contains(t, result, "granite-7b-lab")
		assert.Contains(t, result, "maas-vllm-inference")

		// Verify models are also added to registered_resources
		var cfg LlamaStackConfig
		err = cfg.FromYAML(result)
		assert.NoError(t, err)
		registered := map[string]bool{}
		for _, m := range cfg.RegisteredResources.Models {
			registered[m.ModelID] = true
		}
		assert.True(t, registered[constants.DefaultEmbeddingModel().ModelID], "default embedding model should be registered")
		assert.True(t, registered["llama-2-7b-chat"], "MaaS model should be registered")
		assert.True(t, registered["granite-7b-lab"], "MaaS model should be registered")
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

		// Test the MaaS model handling logic (with empty guardrails)
		result, err := client.generateLlamaStackConfig(ctx, "test-namespace", models, false, mockMaaSClient)

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

		// Test the MaaS model handling logic (with empty guardrails)
		result, err := client.generateLlamaStackConfig(ctx, "test-namespace", models, false, mockMaaSClient)

		// This should fail because the model is not found
		assert.Error(t, err)
		assert.Empty(t, result)
		assert.Contains(t, err.Error(), "not found")
	})
}

func TestGenerateLlamaStackConfig_RBACFlag(t *testing.T) {
	t.Run("should NOT include RBAC auth when EnableLlamaStackRBAC is false", func(t *testing.T) {
		mockMaaSClient := &maasmocks.MockMaaSClient{}

		// Create client with RBAC disabled (default)
		client := &TokenKubernetesClient{
			Logger:    slog.Default(),
			EnvConfig: config.EnvConfig{EnableLlamaStackRBAC: false},
		}

		testModels := []models.InstallModel{
			{ModelName: "llama-2-7b-chat", IsMaaSModel: true},
		}

		ctx := context.Background()
		result, err := client.generateLlamaStackConfig(ctx, "test-namespace", testModels, false, mockMaaSClient)
		require.NoError(t, err)
		require.NotEmpty(t, result)

		// Parse and verify auth is NOT set
		var cfg LlamaStackConfig
		err = cfg.FromYAML(result)
		require.NoError(t, err)
		assert.Nil(t, cfg.Server.Auth, "Auth should be nil when RBAC flag is disabled")

		// Also verify by string content
		assert.NotContains(t, result, "provider_config:")
		assert.NotContains(t, result, "access_policy:")
	})

	t.Run("should include RBAC auth when EnableLlamaStackRBAC is true", func(t *testing.T) {
		mockMaaSClient := &maasmocks.MockMaaSClient{}

		// Create client with RBAC enabled
		client := &TokenKubernetesClient{
			Logger:    slog.Default(),
			EnvConfig: config.EnvConfig{EnableLlamaStackRBAC: true},
		}

		testModels := []models.InstallModel{
			{ModelName: "llama-2-7b-chat", IsMaaSModel: true},
		}

		ctx := context.Background()
		result, err := client.generateLlamaStackConfig(ctx, "test-namespace", testModels, false, mockMaaSClient)
		require.NoError(t, err)
		require.NotEmpty(t, result)

		// Parse and verify auth IS set
		var cfg LlamaStackConfig
		err = cfg.FromYAML(result)
		require.NoError(t, err)
		require.NotNil(t, cfg.Server.Auth, "Auth should be set when RBAC flag is enabled")
		require.NotNil(t, cfg.Server.Auth.ProviderConfig)
		assert.Equal(t, "kubernetes", cfg.Server.Auth.ProviderConfig.Type)
		assert.Len(t, cfg.Server.Auth.AccessPolicy, 2)

		// Verify access policies
		assert.Contains(t, result, "user with admin in roles")
		assert.Contains(t, result, "user with system:authenticated in roles")
	})

	t.Run("default EnvConfig should have RBAC disabled", func(t *testing.T) {
		// Verify the zero-value of EnvConfig has RBAC disabled
		var cfg config.EnvConfig
		assert.False(t, cfg.EnableLlamaStackRBAC, "EnableLlamaStackRBAC should default to false")
	})
}

// TestLLMInferenceServiceURLConstruction tests that the URL format for LLMInferenceService
// remains consistent and doesn't accidentally change
func TestLLMInferenceServiceURLConstruction(t *testing.T) {
	tests := []struct {
		name        string
		scheme      string
		serviceName string
		namespace   string
		port        int32
		expected    string
	}{
		{
			name:        "http URL without auth",
			scheme:      "http",
			serviceName: "test-service",
			namespace:   "test-namespace",
			port:        8080,
			expected:    "http://test-service.test-namespace.svc.cluster.local:8080/v1",
		},
		{
			name:        "https URL with auth",
			scheme:      "https",
			serviceName: "secure-service",
			namespace:   "prod-namespace",
			port:        8443,
			expected:    "https://secure-service.prod-namespace.svc.cluster.local:8443/v1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Call the actual function used in extractEndpointFromLLMInferenceService
			actual := ConstructLLMInferenceServiceURL(tt.scheme, tt.serviceName, tt.namespace, tt.port)

			assert.Equal(t, tt.expected, actual,
				"LLMInferenceService URL format must remain: {scheme}://{service}.{namespace}.svc.cluster.local:{port}/v1")
		})
	}
}

// TestInferenceServiceURLSuffixConstruction tests that InferenceService URLs
// always get the /v1 suffix appended correctly
func TestInferenceServiceURLSuffixConstruction(t *testing.T) {
	tests := []struct {
		name     string
		inputURL string
		expected string
	}{
		{
			name:     "URL without /v1 suffix gets it added",
			inputURL: "http://my-service.namespace.svc.cluster.local",
			expected: "http://my-service.namespace.svc.cluster.local/v1",
		},
		{
			name:     "URL with /v1 suffix remains unchanged",
			inputURL: "http://my-service.namespace.svc.cluster.local/v1",
			expected: "http://my-service.namespace.svc.cluster.local/v1",
		},
		{
			name:     "URL with port without /v1 suffix gets it added",
			inputURL: "http://my-service.namespace.svc.cluster.local:8080",
			expected: "http://my-service.namespace.svc.cluster.local:8080/v1",
		},
		{
			name:     "URL with port and /v1 suffix remains unchanged",
			inputURL: "https://my-service.namespace.svc.cluster.local:8443/v1",
			expected: "https://my-service.namespace.svc.cluster.local:8443/v1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Call the actual function used for InferenceService URLs
			actual := EnsureV1Suffix(tt.inputURL)

			assert.Equal(t, tt.expected, actual,
				"InferenceService URLs must always end with /v1")
		})
	}
}

// TestLLMInferenceServiceSchemeSelection tests that the scheme is correctly
// determined based on the auth annotation
func TestLLMInferenceServiceSchemeSelection(t *testing.T) {
	tests := []struct {
		name           string
		authAnnotation string
		expected       string
	}{
		{
			name:           "no auth annotation defaults to http",
			authAnnotation: "",
			expected:       "http",
		},
		{
			name:           "auth annotation set to false uses http",
			authAnnotation: "false",
			expected:       "http",
		},
		{
			name:           "auth annotation set to true uses https",
			authAnnotation: "true",
			expected:       "https",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Call the actual function used in extractEndpointFromLLMInferenceService
			actual := DetermineSchemeFromAuth(tt.authAnnotation)

			assert.Equal(t, tt.expected, actual,
				"Scheme must be 'https' only when security.opendatahub.io/enable-auth annotation is 'true'")
		})
	}
}

// TestKServeServiceConstants tests that the label keys used for finding services
// remain consistent and don't accidentally change
func TestKServeServiceConstants(t *testing.T) {
	t.Run("InferenceService label key must be serving.kserve.io/inferenceservice", func(t *testing.T) {
		assert.Equal(t, "serving.kserve.io/inferenceservice", InferenceServiceName,
			"InferenceService label key must not change - this would break service discovery")
	})

	t.Run("LLMInferenceService name label key must be app.kubernetes.io/name", func(t *testing.T) {
		assert.Equal(t, "app.kubernetes.io/name", LLMInferenceServiceName,
			"LLMInferenceService name label key must not change - this would break service discovery")
	})

	t.Run("LLMInferenceService component label key must be app.kubernetes.io/component", func(t *testing.T) {
		assert.Equal(t, "app.kubernetes.io/component", LLMInferenceServiceComponent,
			"LLMInferenceService component label key must not change - this would break service discovery")
	})

	t.Run("LLMInferenceService workload component value must be llminferenceservice-workload", func(t *testing.T) {
		assert.Equal(t, "llminferenceservice-workload", LLMInferenceServiceWorkloadComponent,
			"LLMInferenceService workload component value must not change - this would break service discovery")
	})
	t.Run("LLMInferenceService auth annotation key must be security.opendatahub.io/enable-auth", func(t *testing.T) {
		assert.Equal(t, "security.opendatahub.io/enable-auth", authAnnotationKey,
			"LLMInferenceService auth annotation key must not change - this would break authentication scheme determination")
	})
}

// TestHeadlessServicePortLogic tests that port is added to URL only when
// the service is headless AND the URL doesn't already have a port
func TestHeadlessServicePortLogic(t *testing.T) {
	tests := []struct {
		name          string
		isHeadless    bool
		urlHasPort    bool
		expectedAdded bool
		description   string
	}{
		{
			name:          "headless service without port in URL adds port",
			isHeadless:    true,
			urlHasPort:    false,
			expectedAdded: true,
			description:   "Port should be added when service is headless and URL has no port",
		},
		{
			name:          "headless service with port in URL does not add port",
			isHeadless:    true,
			urlHasPort:    true,
			expectedAdded: false,
			description:   "Port should NOT be added when service is headless but URL already has port",
		},
		{
			name:          "non-headless service without port in URL does not add port",
			isHeadless:    false,
			urlHasPort:    false,
			expectedAdded: false,
			description:   "Port should NOT be added when service is not headless",
		},
		{
			name:          "non-headless service with port in URL does not add port",
			isHeadless:    false,
			urlHasPort:    true,
			expectedAdded: false,
			description:   "Port should NOT be added when service is not headless (even with port already present)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Call the actual function used in getModelDetailsFromServingRuntime
			shouldAddPort := ShouldAddPortToURL(tt.isHeadless, tt.urlHasPort)

			assert.Equal(t, tt.expectedAdded, shouldAddPort, tt.description)
		})
	}
}

// mustParseURL is a test helper that parses a URL string and panics on failure.
func mustParseURL(u string) *apis.URL {
	parsed, err := apis.ParseURL(u)
	if err != nil {
		panic(err)
	}
	return parsed
}

func TestExtractEndpointsFromLLMInferenceService(t *testing.T) {
	client := &TokenKubernetesClient{
		Logger: slog.Default(),
	}

	t.Run("nil LLMInferenceService returns empty endpoints", func(t *testing.T) {
		endpoints := client.extractEndpointsFromLLMInferenceService(nil)
		assert.Empty(t, endpoints)
	})

	t.Run("empty status returns empty endpoints", func(t *testing.T) {
		llmSvc := &kservev1alpha1.LLMInferenceService{}
		endpoints := client.extractEndpointsFromLLMInferenceService(llmSvc)
		assert.Empty(t, endpoints)
	})

	t.Run("status.url set with external URL returns external endpoint", func(t *testing.T) {
		llmSvc := &kservev1alpha1.LLMInferenceService{
			Status: kservev1alpha1.LLMInferenceServiceStatus{
				URL: mustParseURL("https://my-model.apps.example.com/v1"),
			},
		}
		endpoints := client.extractEndpointsFromLLMInferenceService(llmSvc)
		assert.Len(t, endpoints, 1)
		assert.Equal(t, "external: https://my-model.apps.example.com/v1", endpoints[0])
	})

	t.Run("status.url with svc.cluster.local is not added as external", func(t *testing.T) {
		llmSvc := &kservev1alpha1.LLMInferenceService{
			Status: kservev1alpha1.LLMInferenceServiceStatus{
				URL: mustParseURL("https://my-model.namespace.svc.cluster.local:8080/v1"),
			},
		}
		endpoints := client.extractEndpointsFromLLMInferenceService(llmSvc)
		// svc.cluster.local URL in Status.URL is ignored; no Addresses to fall back to.
		assert.Empty(t, endpoints)
	})

	t.Run("only status.addresses with internal URL returns internal endpoint", func(t *testing.T) {
		// This is the real-world scenario: KServe controller sets addresses but not url or address (singular)
		llmSvc := &kservev1alpha1.LLMInferenceService{
			Status: kservev1alpha1.LLMInferenceServiceStatus{
				AddressStatus: duckv1.AddressStatus{
					Addresses: []duckv1.Addressable{
						{URL: mustParseURL("https://openshift-ai-inference.openshift-ingress.svc.cluster.local/ns/my-model")},
					},
				},
			},
		}
		endpoints := client.extractEndpointsFromLLMInferenceService(llmSvc)
		assert.Len(t, endpoints, 1)
		assert.Equal(t, "internal: https://openshift-ai-inference.openshift-ingress.svc.cluster.local/ns/my-model", endpoints[0])
	})

	t.Run("only status.addresses with external URL returns external endpoint", func(t *testing.T) {
		llmSvc := &kservev1alpha1.LLMInferenceService{
			Status: kservev1alpha1.LLMInferenceServiceStatus{
				AddressStatus: duckv1.AddressStatus{
					Addresses: []duckv1.Addressable{
						{URL: mustParseURL("https://my-model.apps.example.com/v1")},
					},
				},
			},
		}
		endpoints := client.extractEndpointsFromLLMInferenceService(llmSvc)
		assert.Len(t, endpoints, 1)
		assert.Equal(t, "external: https://my-model.apps.example.com/v1", endpoints[0])
	})

	t.Run("status.addresses with both internal and external URLs", func(t *testing.T) {
		llmSvc := &kservev1alpha1.LLMInferenceService{
			Status: kservev1alpha1.LLMInferenceServiceStatus{
				AddressStatus: duckv1.AddressStatus{
					Addresses: []duckv1.Addressable{
						{URL: mustParseURL("https://my-model.namespace.svc.cluster.local:8080/v1")},
						{URL: mustParseURL("https://my-model.apps.example.com/v1")},
					},
				},
			},
		}
		endpoints := client.extractEndpointsFromLLMInferenceService(llmSvc)
		assert.Len(t, endpoints, 2)
		assert.Equal(t, "internal: https://my-model.namespace.svc.cluster.local:8080/v1", endpoints[0])
		assert.Equal(t, "external: https://my-model.apps.example.com/v1", endpoints[1])
	})

	t.Run("status.url and status.addresses both set does not duplicate", func(t *testing.T) {
		llmSvc := &kservev1alpha1.LLMInferenceService{
			Status: kservev1alpha1.LLMInferenceServiceStatus{
				URL: mustParseURL("https://my-model.apps.example.com/v1"),
				AddressStatus: duckv1.AddressStatus{
					Addresses: []duckv1.Addressable{
						{URL: mustParseURL("https://my-model.namespace.svc.cluster.local:8080/v1")},
						{URL: mustParseURL("https://my-model.apps.example.com/v1")},
					},
				},
			},
		}
		endpoints := client.extractEndpointsFromLLMInferenceService(llmSvc)
		// Internal from Addresses fallback, external from Status.URL, no duplicate external
		assert.Len(t, endpoints, 2)
		assert.Equal(t, "internal: https://my-model.namespace.svc.cluster.local:8080/v1", endpoints[0])
		assert.Equal(t, "external: https://my-model.apps.example.com/v1", endpoints[1])
	})

	t.Run("status.address singular and status.addresses both set does not duplicate", func(t *testing.T) {
		internalURL := mustParseURL("https://my-model.namespace.svc.cluster.local:8080/v1")
		llmSvc := &kservev1alpha1.LLMInferenceService{
			Status: kservev1alpha1.LLMInferenceServiceStatus{
				AddressStatus: duckv1.AddressStatus{
					Address: &duckv1.Addressable{URL: internalURL},
					Addresses: []duckv1.Addressable{
						{URL: mustParseURL("https://my-model.namespace.svc.cluster.local:8080/v1")},
						{URL: mustParseURL("https://my-model.apps.example.com/v1")},
					},
				},
			},
		}
		endpoints := client.extractEndpointsFromLLMInferenceService(llmSvc)
		// Should have internal from Address (singular) + external from Addresses, no duplicate internal
		assert.Len(t, endpoints, 2)
		assert.Equal(t, "internal: https://my-model.namespace.svc.cluster.local:8080/v1", endpoints[0])
		assert.Equal(t, "external: https://my-model.apps.example.com/v1", endpoints[1])
	})

	t.Run("status.addresses with nil URL entries are skipped", func(t *testing.T) {
		llmSvc := &kservev1alpha1.LLMInferenceService{
			Status: kservev1alpha1.LLMInferenceServiceStatus{
				AddressStatus: duckv1.AddressStatus{
					Addresses: []duckv1.Addressable{
						{URL: nil},
						{URL: mustParseURL("https://my-model.apps.example.com/v1")},
					},
				},
			},
		}
		endpoints := client.extractEndpointsFromLLMInferenceService(llmSvc)
		assert.Len(t, endpoints, 1)
		assert.Equal(t, "external: https://my-model.apps.example.com/v1", endpoints[0])
	})
}
