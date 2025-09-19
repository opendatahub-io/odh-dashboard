package k8smocks

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models/genaiassets"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"

	// Import the typed LlamaStackDistribution types
	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
)

const (
	mockLSDName = "mock-lsd"
)

type TokenKubernetesClientMock struct {
	*k8s.TokenKubernetesClient
}

func newMockedTokenKubernetesClientFromClientset(ctrlClient client.Client, config *rest.Config, logger *slog.Logger) k8s.KubernetesClientInterface {
	return &TokenKubernetesClientMock{
		TokenKubernetesClient: &k8s.TokenKubernetesClient{
			Client: ctrlClient,
			Logger: logger,
			Token:  integrations.NewBearerToken(""), // Unused because impersonation is already handled in the client config
			Config: config,
		},
	}
}

// BearerToken always returns a fake token for tests
func (m *TokenKubernetesClientMock) BearerToken() (string, error) {
	return "FAKE_BEARER_TOKEN", nil
}

// GetNamespaces returns mock namespace data for testing
func (m *TokenKubernetesClientMock) GetNamespaces(ctx context.Context, identity *integrations.RequestIdentity) ([]corev1.Namespace, error) {
	// Return mock test namespaces instead of real cluster data
	return []corev1.Namespace{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name: "mock-test-namespace-1",
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name: "mock-test-namespace-2",
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name: "mock-test-namespace-3",
			},
		},
	}, nil
}

// GetAAModels returns mock AA models for testing
func (m *TokenKubernetesClientMock) GetAAModels(ctx context.Context, identity *integrations.RequestIdentity, namespace string) ([]genaiassets.AAModel, error) {
	// Return mock AA models for testing
	return []genaiassets.AAModel{
		{
			ModelName:      "mock-model-1",
			ServingRuntime: "OpenVINO Model Server",
			APIProtocol:    "v2",
			Version:        "v2025.1",
			Description:    "A high-performance computer vision model for object detection and classification",
			Usecase:        "Computer Vision",
			Endpoints: []string{
				"internal: http://mock-model-1.namespace.svc.cluster.local:8080",
				"external: https://mock-model-1.example.com",
			},
		},
		{
			ModelName:      "mock-model-2",
			ServingRuntime: "TorchServe",
			APIProtocol:    "v1",
			Version:        "v2025.1",
			Description:    "A natural language processing model for text generation and completion",
			Usecase:        "Natural Language Processing",
			Endpoints: []string{
				"internal: http://mock-model-2.namespace.svc.cluster.local:8080",
			},
		},
	}, nil
}

// IsClusterAdmin returns mock admin status for testing
func (m *TokenKubernetesClientMock) IsClusterAdmin(ctx context.Context, identity *integrations.RequestIdentity) (bool, error) {
	// TODO: Fix this when rbac specific tests are implemented.
	return false, nil
}

// GetUser returns mock username for testing
func (m *TokenKubernetesClientMock) GetUser(ctx context.Context, identity *integrations.RequestIdentity) (string, error) {
	return "mockUser", nil
}

// GetLlamaStackDistributions returns mock LSD list for testing
func (m *TokenKubernetesClientMock) GetLlamaStackDistributions(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (*lsdapi.LlamaStackDistributionList, error) {
	// Return empty list for mock-test-namespace-1 to test empty state
	if namespace == "mock-test-namespace-1" {
		return &lsdapi.LlamaStackDistributionList{
			Items: []lsdapi.LlamaStackDistribution{},
		}, nil
	}

	// For all other namespaces, return mock LSD data
	return &lsdapi.LlamaStackDistributionList{
		Items: []lsdapi.LlamaStackDistribution{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name: "mock-lsd",
					Annotations: map[string]string{
						"openshift.io/display-name": "mock-lsd-display-name",
					},
					Labels: map[string]string{
						"opendatahub.io/dashboard": "true",
					},
				},
				Status: lsdapi.LlamaStackDistributionStatus{
					Phase: lsdapi.LlamaStackDistributionPhaseReady,
					Version: lsdapi.VersionInfo{
						LlamaStackServerVersion: "v0.2.0",
					},
					ServiceURL: "http://mock-lsd.test-namespace.svc.cluster.local:8321",
					DistributionConfig: lsdapi.DistributionConfig{
						ActiveDistribution: "mock-distribution",
						Providers: []lsdapi.ProviderInfo{
							{
								ProviderID:   "mock-provider",
								ProviderType: "mock-type",
								API:          "mock-api",
							},
						},
						AvailableDistributions: map[string]string{
							"mock-distribution": "mock-image:latest",
						},
					},
				},
			},
		},
	}, nil
}

func (m *TokenKubernetesClientMock) InstallLlamaStackDistribution(ctx context.Context, identity *integrations.RequestIdentity, namespace string, models []string) (*lsdapi.LlamaStackDistribution, error) {
	// First ensure the namespace exists
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: namespace,
		},
	}
	err := m.Client.Create(ctx, ns)
	if err != nil && !errors.IsAlreadyExists(err) {
		return nil, fmt.Errorf("failed to create namespace %s: %w", namespace, err)
	}

	// Then create the ConfigMap that the LSD will reference
	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "llama-stack-config",
			Namespace: namespace,
		},
		Data: map[string]string{
			"run.yaml": `# Llama Stack Configuration
version: "2"
image_name: rh
apis:
- datasetio
- files
- inference
- scoring
- telemetry
- tool_runtime
- vector_io
providers:
  inference:
  - provider_id: vllm-inference-1
    provider_type: remote::vllm
    config:
      url: http://mock-model-predictor.` + namespace + `.svc.cluster.local:8080/v1
      max_tokens: ${env.VLLM_MAX_TOKENS:=4096}
      api_token: ${env.VLLM_API_TOKEN:=fake}
      tls_verify: ${env.VLLM_TLS_VERIFY:=true}
  - provider_id: sentence-transformers
    provider_type: inline::sentence-transformers
    config: {}
  vector_io:
  - provider_id: milvus
    provider_type: inline::milvus
    config:
      db_path: /opt/app-root/src/.llama/distributions/rh/milvus.db
      kvstore:
        type: sqlite
        namespace: null
        db_path: /opt/app-root/src/.llama/distributions/rh/milvus_registry.db
  safety: []
  eval: []
  files:
  - provider_id: meta-reference-files
    provider_type: inline::localfs
    config:
      storage_dir: /opt/app-root/src/.llama/distributions/rh/files
      metadata_store:
        type: sqlite
        db_path: /opt/app-root/src/.llama/distributions/rh/files_metadata.db
  datasetio:
  - provider_id: huggingface
    provider_type: remote::huggingface
    config:
      kvstore:
        type: sqlite
        namespace: null
        db_path: /opt/app-root/src/.llama/distributions/rh/huggingface_datasetio.db
  scoring:
  - provider_id: basic
    provider_type: inline::basic
    config: {}
  - provider_id: llm-as-judge
    provider_type: inline::llm-as-judge
    config: {}
  - provider_id: braintrust
    provider_type: inline::braintrust
    config:
      openai_api_key: ${env.OPENAI_API_KEY:=}
  telemetry:
  - provider_id: meta-reference
    provider_type: inline::meta-reference
    config:
      service_name: "${env.OTEL_SERVICE_NAME:=\u200B}"
      sinks: ${env.TELEMETRY_SINKS:=console,sqlite}
      sqlite_db_path: /opt/app-root/src/.llama/distributions/rh/trace_store.db
      otel_exporter_otlp_endpoint: ${env.OTEL_EXPORTER_OTLP_ENDPOINT:=}
  tool_runtime:
  - provider_id: rag-runtime
    provider_type: inline::rag-runtime
    config: {}
  - provider_id: model-context-protocol
    provider_type: remote::model-context-protocol
    config: {}
metadata_store:
  type: sqlite
  db_path: /opt/app-root/src/.llama/distributions/rh/registry.db
  type: sqlite
  db_path: /opt/app-root/src/.llama/distributions/rh/inference_store.db
models:
  - metadata:
      embedding_dimension: 768
    model_id: granite-embedding-125m
    provider_id: sentence-transformers
    provider_model_id: ibm-granite/granite-embedding-125m-english
    model_type: embedding
  - metadata: {}
    model_id: mock-model
    provider_id: vllm-inference-1
    model_type: llm
shields: []
vector_dbs: []
datasets: []
scoring_fns: []
benchmarks: []
tool_groups:
- toolgroup_id: builtin::rag
  provider_id: rag-runtime
server:
  port: 8321`,
		},
	}

	// Create the ConfigMap in the envtest cluster
	err = m.Client.Create(ctx, configMap)
	if err != nil {
		return nil, fmt.Errorf("failed to create ConfigMap in envtest cluster: %w", err)
	}

	// Create a real LSD resource in the envtest cluster
	lsd := &lsdapi.LlamaStackDistribution{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mockLSDName,
			Namespace: namespace,
			Annotations: map[string]string{
				"openshift.io/display-name": mockLSDName,
			},
			Labels: map[string]string{
				"opendatahub.io/dashboard": "true",
			},
		},
		Spec: lsdapi.LlamaStackDistributionSpec{
			Replicas: 1,
			Server: lsdapi.ServerSpec{
				ContainerSpec: lsdapi.ContainerSpec{
					Command: []string{"/bin/sh", "-c", "llama stack run /etc/llama-stack/run.yaml"},
					Resources: corev1.ResourceRequirements{
						Requests: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("250m"),
							corev1.ResourceMemory: resource.MustParse("500Mi"),
						},
						Limits: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("2"),
							corev1.ResourceMemory: resource.MustParse("12Gi"),
						},
					},
					Env: []corev1.EnvVar{
						{Name: "VLLM_TLS_VERIFY", Value: "false"},
						{Name: "MILVUS_DB_PATH", Value: "~/.llama/milvus.db"},
						{Name: "FMS_ORCHESTRATOR_URL", Value: "http://localhost"},
						{Name: "VLLM_MAX_TOKENS", Value: "4096"},
					},
					Name: "llama-stack",
					Port: 8321,
				},
				Distribution: lsdapi.DistributionType{Name: "rh-dev"},
				UserConfig: &lsdapi.UserConfigSpec{
					ConfigMapName: "llama-stack-config",
				},
			},
		},
	}

	// Create the LSD resource in the envtest cluster
	err = m.Client.Create(ctx, lsd)
	if err != nil {
		return nil, fmt.Errorf("failed to create LlamaStackDistribution in envtest cluster: %w", err)
	}

	return lsd, nil
}

func (m *TokenKubernetesClientMock) DeleteLlamaStackDistribution(ctx context.Context, identity *integrations.RequestIdentity, namespace string, name string) (*lsdapi.LlamaStackDistribution, error) {
	// First, fetch the LSD in the namespace with the OpenDataHubDashboardLabelKey annotation
	lsdList, err := m.GetLlamaStackDistributions(ctx, identity, namespace)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch LlamaStackDistributions: %w", err)
	}

	// Check if any LSD resources were found
	if len(lsdList.Items) == 0 {
		return nil, fmt.Errorf("no LlamaStackDistribution found in namespace %s with OpenDataHubDashboardLabelKey annotation", namespace)
	}

	// Find the LSD with matching display name annotation
	var targetLSD *lsdapi.LlamaStackDistribution
	for i := range lsdList.Items {
		lsd := &lsdList.Items[i]
		if displayName, exists := lsd.Annotations["openshift.io/display-name"]; exists && displayName == name {
			targetLSD = lsd
			break
		}
	}

	// If no LSD with matching display name found, return error
	if targetLSD == nil {
		return nil, fmt.Errorf("LlamaStackDistribution with display name '%s' not found in namespace %s", name, namespace)
	}

	// Delete the LSD using the actual resource name
	err = m.Client.Delete(ctx, &lsdapi.LlamaStackDistribution{ObjectMeta: metav1.ObjectMeta{Name: targetLSD.Name, Namespace: namespace}})
	if err != nil {
		return nil, fmt.Errorf("failed to delete LlamaStackDistribution: %w", err)
	}

	return targetLSD, nil
}

func (m *TokenKubernetesClientMock) GetConfigMap(ctx context.Context, identity *integrations.RequestIdentity, namespace string, name string) (*corev1.ConfigMap, error) {
	// Return mock ConfigMap for testing
	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
		Data: map[string]string{
			"brave": `{
  "url": "http://localhost:9090/sse",
  "transport": "sse",
  "description": "Search the Internet using Brave Search."
}`,
			"kubernetes": `{
  "url": "http://localhost:9091/mcp",
  "description": "Manage resources in a Kubernetes cluster.",
  "logo": "https://kubernetes.io/images/kubernetes-horizontal-color.png"
}`,
			"default-transport": `{
  "url": "http://localhost:9092/default-transport",
  "description": "Server with default transport (streamable-http)."
}`,
			"invalid-transport": `{
  "url": "http://localhost:9093/invalid-transport",
  "transport": "invalid-transport-type",
  "description": "Server with invalid transport field."
}`,
			"unavailable-server": `{
  "url": "https://mcp-unavailable:8080/sse",
  "transport": "sse",
  "description": "Server that is not reachable for testing error scenarios."
}`,
			"error-server": `{
  "url": "https://mcp-error:8080/mcp",
  "description": "Server that returns authentication errors for testing."
}`,
			"github-copilot": `{
  "url": "https://api.githubcopilot.com/mcp",
  "description": "GitHub Copilot MCP server with advanced kubectl tools.",
  "logo": "https://github.com/images/modules/logos_page/GitHub-Mark.png"
}`,
		},
	}, nil
}
