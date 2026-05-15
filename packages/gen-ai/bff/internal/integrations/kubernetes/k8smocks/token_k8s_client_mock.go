package k8smocks

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/types"
	gorchv1alpha1 "github.com/trustyai-explainability/trustyai-service-operator/api/gorch/v1alpha1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"

	ogxapi "github.com/ogx-ai/ogx-k8s-operator/api/v1beta1"
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

// GetNamespaces lists namespaces from the envtest cluster
func (m *TokenKubernetesClientMock) GetNamespaces(ctx context.Context, identity *integrations.RequestIdentity) ([]corev1.Namespace, error) {
	var nsList corev1.NamespaceList
	if err := m.Client.List(ctx, &nsList); err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}
	return nsList.Items, nil
}

// GetAAModels returns mock AA models plus any external models from ConfigMaps
func (m *TokenKubernetesClientMock) GetAAModels(ctx context.Context, identity *integrations.RequestIdentity, namespace string) ([]models.AAModel, error) {
	// Special case: empty-test-namespace should always return empty list for testing empty state (no namespace models, no MaaS models, no external models)
	if namespace == "empty-test-namespace" {
		return []models.AAModel{}, nil
	}

	var mockModels []models.AAModel

	// Return different mock AA models based on namespace
	switch namespace {
	case "mock-test-namespace-1":
		// Return only LLMInferenceService models for testing llm-d architecture
		mockModels = []models.AAModel{
			{
				ModelName:      "llm-d-codestral-22b",
				ModelID:        "llm-d-codestral-22b",
				ServingRuntime: "Distributed inference with llm-d",
				APIProtocol:    "REST",
				Version:        "",
				Description:    "Mistral Codestral 22B model optimized for code generation with llm-d prefill/decode separation",
				Usecase:        "Code generation, Software development",
				Endpoints: []string{
					fmt.Sprintf("internal: http://llm-d-codestral-22b.%s.svc.cluster.local:80", namespace),
					fmt.Sprintf("external: https://llm-d-codestral-22b-%s.example.com", namespace),
				},
				Status:          "Running",
				DisplayName:     "LLM-D Codestral 22B",
				ModelSourceType: models.ModelSourceTypeNamespace,
			},
			{
				ModelName:      "llm-d-deepseek-coder-33b",
				ModelID:        "llm-d-deepseek-coder-33b",
				ServingRuntime: "Distributed inference with llm-d",
				APIProtocol:    "REST",
				Version:        "",
				Description:    "DeepSeek Coder 33B model with llm-d architecture for high-performance code completion",
				Usecase:        "Code completion, Programming assistance",
				Endpoints: []string{
					fmt.Sprintf("internal: http://llm-d-deepseek-coder-33b.%s.svc.cluster.local:80", namespace),
				},
				Status:          "Running",
				DisplayName:     "LLM-D DeepSeek Coder 33B",
				ModelSourceType: models.ModelSourceTypeNamespace,
			},
		}
	case "mock-test-namespace-2", "mock-test-namespace-3":
		mockModels = []models.AAModel{
			{
				ModelName:      "granite-7b-code",
				ModelID:        "granite-7b-code",
				ServingRuntime: "OpenVINO Model Server",
				APIProtocol:    "v2",
				Version:        "v2025.1",
				Description:    "IBM Granite 7B model specialized for code generation tasks",
				Usecase:        "Code generation",
				Endpoints: []string{
					fmt.Sprintf("internal: http://granite-7b-code.%s.svc.cluster.local:8080", namespace),
					fmt.Sprintf("external: https://granite-7b-code-%s.example.com", namespace),
				},
				Status:          "Running",
				DisplayName:     "Granite 7B code",
				ModelSourceType: models.ModelSourceTypeNamespace,
			},
			{
				ModelName:      "llama-3.1-8b-instruct",
				ModelID:        "llama-3.1-8b-instruct",
				ServingRuntime: "TorchServe",
				APIProtocol:    "v1",
				Version:        "v2025.1",
				Description:    "Meta Llama 3.1 8B parameter model optimized for instruction following",
				Usecase:        "General chat",
				Endpoints: []string{
					fmt.Sprintf("internal: http://llama-3.1-8b-instruct.%s.svc.cluster.local:8080", namespace),
					fmt.Sprintf("external: https://llama-3.1-8b-instruct-%s.example.com", namespace),
				},
				Status:          "Running",
				DisplayName:     "Llama 3.1 8B instruct",
				ModelSourceType: models.ModelSourceTypeNamespace,
			},
			{
				ModelName:      "mistral-7b-instruct",
				ModelID:        "mistral-7b-instruct",
				ServingRuntime: "TorchServe",
				APIProtocol:    "v1",
				Version:        "v2025.1",
				Description:    "Mistral 7B instruction-tuned model for general purpose tasks",
				Usecase:        "Multilingual, Reasoning",
				Endpoints: []string{
					fmt.Sprintf("internal: http://mistral-7b-instruct.%s.svc.cluster.local:8080", namespace),
				},
				Status:          "Stop",
				DisplayName:     "Mistral 7B instruct",
				ModelSourceType: models.ModelSourceTypeNamespace,
			},
			{
				ModelName:      "ollama/llama3.2:3b",
				ModelID:        "ollama/llama3.2:3b",
				ServingRuntime: "Ollama",
				APIProtocol:    "v1",
				Version:        "v2025.1",
				Description:    "Meta Llama 3.2 3B parameter model optimized for efficiency and performance",
				Usecase:        "General chat, Code generation",
				Endpoints: []string{
					fmt.Sprintf("internal: http://llama3.2-3b.%s.svc.cluster.local:11434", namespace),
					fmt.Sprintf("external: https://llama3.2-3b-%s.example.com", namespace),
				},
				Status:          "Running",
				DisplayName:     "Ollama Llama 3.2 3B",
				ModelSourceType: models.ModelSourceTypeNamespace,
			},
			{
				ModelName:      "ollama/all-minilm:l6-v2",
				ModelID:        "ollama/all-minilm:l6-v2",
				ServingRuntime: "Ollama",
				APIProtocol:    "v1",
				Version:        "v2025.1",
				Description:    "Microsoft All-MiniLM-L6-v2 embedding model for semantic search and text similarity",
				Usecase:        "Embeddings, Semantic search",
				Endpoints: []string{
					fmt.Sprintf("internal: http://all-minilm-l6-v2.%s.svc.cluster.local:11434", namespace),
					fmt.Sprintf("external: https://all-minilm-l6-v2-%s.example.com", namespace),
				},
				Status:          "Running",
				DisplayName:     "Ollama All MiniLM L6 v2",
				ModelSourceType: models.ModelSourceTypeNamespace,
			},
		}

		// LLMInferenceService examples (llm-d architecture)
		llmDModels := []models.AAModel{
			{
				ModelName:      "llm-d-llama-3.1-70b",
				ModelID:        "llm-d-llama-3.1-70b",
				ServingRuntime: "Distributed inference with llm-d",
				APIProtocol:    "REST",
				Version:        "",
				Description:    "Meta Llama 3.1 70B model served with llm-d disaggregated architecture for high throughput",
				Usecase:        "Large-scale inference, High throughput",
				Endpoints: []string{
					fmt.Sprintf("internal: http://llm-d-llama-3.1-70b.%s.svc.cluster.local:80", namespace),
					fmt.Sprintf("external: https://llm-d-llama-3.1-70b-%s.example.com", namespace),
				},
				Status:          "Running",
				DisplayName:     "LLM-D Llama 3.1 70B",
				ModelSourceType: models.ModelSourceTypeNamespace,
			},
			{
				ModelName:      "llm-d-mixtral-8x7b",
				ModelID:        "llm-d-mixtral-8x7b",
				ServingRuntime: "Distributed inference with llm-d",
				APIProtocol:    "REST",
				Version:        "",
				Description:    "Mistral Mixtral 8x7B MoE model with llm-d prefill/decode separation for optimal performance",
				Usecase:        "Mixture of Experts, High efficiency",
				Endpoints: []string{
					fmt.Sprintf("internal: http://llm-d-mixtral-8x7b.%s.svc.cluster.local:80", namespace),
					fmt.Sprintf("external: https://llm-d-mixtral-8x7b-%s.example.com", namespace),
				},
				Status:          "Running",
				DisplayName:     "LLM-D Mixtral 8x7B",
				ModelSourceType: models.ModelSourceTypeNamespace,
			},
			{
				ModelName:      "llm-d-qwen2.5-72b",
				ModelID:        "llm-d-qwen2.5-72b",
				ServingRuntime: "Distributed inference with llm-d",
				APIProtocol:    "REST",
				Version:        "",
				Description:    "Alibaba Qwen 2.5 72B model optimized with llm-d architecture for enterprise workloads",
				Usecase:        "Enterprise AI, Multilingual",
				Endpoints: []string{
					fmt.Sprintf("internal: http://llm-d-qwen2.5-72b.%s.svc.cluster.local:80", namespace),
				},
				Status:          "Running",
				DisplayName:     "LLM-D Qwen 2.5 72B",
				ModelSourceType: models.ModelSourceTypeNamespace,
			},
		}

		// Append LLM-D models to the existing models
		mockModels = append(mockModels, llmDModels...)
	default:
		mockModels = []models.AAModel{}
	}

	// Add external models from ConfigMaps if they exist
	externalModels, err := m.GetAAModelsFromExternalModels(ctx, identity, namespace)
	if err != nil {
		// Log error but don't fail - continue with namespace models only
		m.Logger.Warn("failed to get external models, continuing with namespace models only",
			"error", err,
			"namespace", namespace)
		externalModels = []models.AAModel{}
	}
	mockModels = append(mockModels, externalModels...)

	return mockModels, nil
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

// GetOGXServers returns mock OGXServer list for testing
func (m *TokenKubernetesClientMock) GetOGXServers(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (*ogxapi.OGXServerList, error) {
	// Special case: mock-test-namespace-1 should always return empty list for testing empty state
	if namespace == "mock-test-namespace-1" || namespace == "mock-test-namespace-3" {
		return &ogxapi.OGXServerList{
			Items: []ogxapi.OGXServer{},
		}, nil
	}

	// For other namespaces, first try to query the real cluster for OGXServer resources
	var serverList ogxapi.OGXServerList
	err := m.Client.List(ctx, &serverList, client.InNamespace(namespace))
	if err != nil {
		return nil, fmt.Errorf("failed to list OGXServers: %w", err)
	}

	// If we found real OGXServer resources in the cluster, return them
	if len(serverList.Items) > 0 {
		return &serverList, nil
	}

	// For namespaces that should return mock OGXServer data (for testing existing server scenarios)
	if namespace == "mock-test-namespace-2" || namespace == "test-namespace" {
		return &ogxapi.OGXServerList{
			Items: []ogxapi.OGXServer{
				{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "mock-lsd",
						Namespace: namespace,
						Annotations: map[string]string{
							"openshift.io/display-name": "mock-lsd-display-name",
						},
						Labels: map[string]string{
							"opendatahub.io/dashboard": "true",
						},
					},
					Status: ogxapi.OGXServerStatus{
						Phase: ogxapi.OGXServerPhaseReady,
						Version: ogxapi.VersionInfo{
							ServerVersion: "v0.2.0",
						},
						ServiceURL: "http://mock-lsd.test-namespace.svc.cluster.local:8321",
						DistributionConfig: ogxapi.DistributionConfig{
							ActiveDistribution: "mock-distribution",
							Providers: []ogxapi.ProviderInfo{
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

	if namespace == "mock-test-namespace-4" {
		return &ogxapi.OGXServerList{
			Items: []ogxapi.OGXServer{
				{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "mock-lsd",
						Namespace: namespace,
						Annotations: map[string]string{
							"openshift.io/display-name": "mock-lsd-display-name",
						},
						Labels: map[string]string{
							"opendatahub.io/dashboard": "true",
						},
					},
					Status: ogxapi.OGXServerStatus{
						Phase: ogxapi.OGXServerPhaseFailed,
					},
				},
			},
		}, nil
	}

	// For all other namespaces, return empty list (no existing OGXServers)
	return &ogxapi.OGXServerList{
		Items: []ogxapi.OGXServer{},
	}, nil
}

func (m *TokenKubernetesClientMock) InstallOGXServer(ctx context.Context, identity *integrations.RequestIdentity, namespace string, installModels []models.InstallModel, vectorStores []models.InstallVectorStore, maasClient maas.MaaSClientInterface) (*ogxapi.OGXServer, error) {
	if len(vectorStores) > 0 {
		if _, err := m.LoadAndValidateVectorStores(ctx, identity, namespace, vectorStores); err != nil {
			return nil, err
		}
	}

	// Check if an OGXServer already exists in the namespace
	existingList, err := m.GetOGXServers(ctx, identity, namespace)
	if err != nil {
		return nil, fmt.Errorf("failed to check for existing OGXServer: %w", err)
	}

	if len(existingList.Items) > 0 {
		return nil, fmt.Errorf("OGXServer already exists in namespace %s", namespace)
	}

	// First ensure the namespace exists
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: namespace,
		},
	}
	err = m.Client.Create(ctx, ns)
	if err != nil && !errors.IsAlreadyExists(err) {
		return nil, fmt.Errorf("failed to create namespace %s: %w", namespace, err)
	}

	// Then create the ConfigMap that the OGXServer will reference
	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "llama-stack-config",
			Namespace: namespace,
			Labels: map[string]string{
				k8s.OpenDataHubDashboardLabelKey: "true",
				"ogx.io/server":                  mockLSDName,
				"ogx.io/watch":                   "true",
			},
		},
		Data: map[string]string{
			constants.LlamaStackConfigYAMLKey: `# Llama Stack Configuration
version: "2"
distro_name: rh
apis:
- file_processors
- files
- inference
- responses
- tool_runtime
- vector_io
providers:
  inference:
  - provider_id: vllm-inference-1
    provider_type: remote::vllm
    config:
      base_url: http://mock-model-predictor.` + namespace + `.svc.cluster.local:8080/v1
      max_tokens: ${env.VLLM_MAX_TOKENS:=4096}
      api_token: ${env.VLLM_API_TOKEN:=fake}
      tls_verify: ${env.VLLM_TLS_VERIFY:=true}
  - provider_id: sentence-transformers
    provider_type: inline::sentence-transformers
    config:
      trust_remote_code: false
  vector_io:
  - provider_id: faiss
    provider_type: inline::faiss
    config:
      persistence:
        namespace: vector_io::faiss
        backend: kv_default
  file_processors:
  - provider_id: pypdf
    provider_type: inline::pypdf
    config: {}
  responses:
  - provider_id: builtin
    provider_type: inline::builtin
    config:
      persistence:
        responses:
          table_name: responses
          backend: sql_default
          max_write_queue_size: 10000
          num_writers: 4
  files:
  - provider_id: localfs-files
    provider_type: inline::localfs
    config:
      storage_dir: /opt/app-root/src/.llama/distributions/rh/files
      metadata_store:
        table_name: files_metadata
        backend: sql_default
  tool_runtime:
  - provider_id: file-search
    provider_type: inline::file-search
    config: {}
  - provider_id: model-context-protocol
    provider_type: remote::model-context-protocol
    config: {}
metadata_store:
  type: sqlite
  db_path: /opt/app-root/src/.llama/distributions/rh/registry.db
  type: sqlite
  db_path: /opt/app-root/src/.llama/distributions/rh/inference_store.db
storage:
  backends:
    kv_default:
      type: kv_sqlite
      db_path: /opt/app-root/src/.llama/distributions/rh/kvstore.db
    sql_default:
      type: sql_sqlite
      db_path: /opt/app-root/src/.llama/distributions/rh/sql_store.db
  stores:
    metadata:
      namespace: registry
      backend: kv_default
    inference:
      table_name: inference_store
      backend: sql_default
      max_write_queue_size: 10000
      num_writers: 4
    conversations:
      table_name: openai_conversations
      backend: sql_default
    prompts:
      table_name: prompts
      backend: sql_default
    connectors:
      table_name: connectors
      backend: sql_default
registered_resources:
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
  vector_stores: []
server:
  port: 8321`,
		},
	}

	// Create the ConfigMap in the envtest cluster
	err = m.Client.Create(ctx, configMap)
	if err != nil {
		return nil, fmt.Errorf("failed to create ConfigMap in envtest cluster: %w", err)
	}

	replicas := int32(1)
	workloadResources := &corev1.ResourceRequirements{
		Requests: corev1.ResourceList{
			corev1.ResourceCPU:    resource.MustParse("250m"),
			corev1.ResourceMemory: resource.MustParse("500Mi"),
		},
		Limits: corev1.ResourceList{
			corev1.ResourceCPU:    resource.MustParse("2"),
			corev1.ResourceMemory: resource.MustParse("12Gi"),
		},
	}

	ogxServer := &ogxapi.OGXServer{
		ObjectMeta: metav1.ObjectMeta{
			Name:      mockLSDName,
			Namespace: namespace,
			Annotations: map[string]string{
				k8s.DisplayNameAnnotation: mockLSDName,
			},
			Labels: map[string]string{
				"opendatahub.io/dashboard": "true",
			},
		},
		Spec: ogxapi.OGXServerSpec{
			Distribution: ogxapi.DistributionSpec{Name: "rh-dev"},
			OverrideConfig: &ogxapi.ConfigMapKeyRef{
				Name: "llama-stack-config",
				Key:  constants.LlamaStackConfigYAMLKey,
			},
			Network: &ogxapi.NetworkSpec{Port: 8321},
			Workload: &ogxapi.WorkloadSpec{
				Replicas:  &replicas,
				Resources: workloadResources,
				Overrides: &ogxapi.WorkloadOverrides{
					Command: []string{"/bin/sh", "-c", "ogx run /etc/llama-stack/config.yaml"},
					Env: []corev1.EnvVar{
						{Name: "VLLM_TLS_VERIFY", Value: "false"},
						{Name: "FAISS_STORE_DIR", Value: "~/.llama/faiss"},
						{Name: "FMS_ORCHESTRATOR_URL", Value: "http://localhost"},
						{Name: "VLLM_MAX_TOKENS", Value: "4096"},
						{Name: "OGX_CONFIG_DIR", Value: "/opt/app-root/src/.ogx/distributions/rh/"},
					},
				},
			},
		},
	}

	err = m.Client.Create(ctx, ogxServer)
	if err != nil {
		return nil, fmt.Errorf("failed to create OGXServer in envtest cluster: %w", err)
	}

	configMap.OwnerReferences = []metav1.OwnerReference{
		{
			APIVersion:         "ogx.io/v1beta1",
			Kind:               "OGXServer",
			Name:               ogxServer.Name,
			UID:                ogxServer.UID,
			Controller:         &[]bool{true}[0],
			BlockOwnerDeletion: &[]bool{false}[0],
		},
	}
	if updateErr := m.Client.Update(ctx, configMap); updateErr != nil {
		m.Logger.Warn("failed to update ConfigMap with owner reference", "error", updateErr, "namespace", namespace, "configMap", configMap.Name)
	}

	return ogxServer, nil
}

func (m *TokenKubernetesClientMock) DeleteOGXServer(ctx context.Context, identity *integrations.RequestIdentity, namespace string, name string) (*ogxapi.OGXServer, error) {
	serverList, err := m.GetOGXServers(ctx, identity, namespace)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch OGXServers: %w", err)
	}

	if len(serverList.Items) == 0 {
		return nil, fmt.Errorf("no OGXServer found in namespace %s with OpenDataHubDashboardLabelKey annotation", namespace)
	}

	var target *ogxapi.OGXServer
	for i := range serverList.Items {
		srv := &serverList.Items[i]
		if srv.Name == name {
			target = srv
			break
		}
	}

	if target == nil {
		return nil, fmt.Errorf("OGXServer with name '%s' not found in namespace %s", name, namespace)
	}

	err = m.Client.Delete(ctx, &ogxapi.OGXServer{ObjectMeta: metav1.ObjectMeta{Name: target.Name, Namespace: namespace}})
	if err != nil {
		return nil, fmt.Errorf("failed to delete OGXServer: %w", err)
	}

	return target, nil
}

// CanListOGXServers returns mock permission check for testing
func (m *TokenKubernetesClientMock) CanListOGXServers(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (bool, error) {
	// For testing purposes, always return true to allow OGXServer listing
	// In real scenarios, this would perform a SubjectAccessReview
	return true, nil
}

// CanListGuardrailsOrchestrator returns mock permission check for testing
func (m *TokenKubernetesClientMock) CanListGuardrailsOrchestrator(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (bool, error) {
	return true, nil
}

// GetModelProviderInfo returns mock model provider configuration
// Only returns provider_id, provider_type, and url (no api_token or other config)
func (m *TokenKubernetesClientMock) GetModelProviderInfo(ctx context.Context, identity *integrations.RequestIdentity, namespace string, modelID string) (*types.ModelProviderInfo, error) {
	// Return mock provider info based on common model IDs
	mockConfigs := map[string]*types.ModelProviderInfo{
		// Non-MaaS models (vLLM)
		"vllm-inference-1/llama-32-3b-instruct": {
			ModelID:      "vllm-inference-1/llama-32-3b-instruct",
			ProviderID:   "vllm-inference-1",
			ProviderType: "remote::vllm",
			URL:          "http://llama-32-3b-instruct-predictor.team-crimson.svc.cluster.local/v1",
		},
		"llama-32-3b-instruct": {
			ModelID:      "llama-32-3b-instruct",
			ProviderID:   "vllm-inference-1",
			ProviderType: "remote::vllm",
			URL:          "http://llama-32-3b-instruct-predictor.crimson-show.svc.cluster.local/v1",
		},
		// MaaS models (provider_id starts with "maas-")
		"granite-3.1-8b-instruct": {
			ModelID:      "granite-3.1-8b-instruct",
			ProviderID:   "maas-watsonx",
			ProviderType: "remote::watsonx",
			URL:          "https://us-south.ml.cloud.ibm.com/ml/v1",
		},
		"llama-3-70b-instruct": {
			ModelID:      "llama-3-70b-instruct",
			ProviderID:   "maas-vllm-inference-1",
			ProviderType: "remote::vllm",
			URL:          "https://api.azure.com/openai/deployments/llama-3-70b",
		},
	}

	if config, exists := mockConfigs[modelID]; exists {
		return config, nil
	}

	// Return generic mock config for unknown models (non-MaaS)
	return &types.ModelProviderInfo{
		ModelID:      modelID,
		ProviderID:   "vllm-inference-1",
		ProviderType: "remote::vllm",
		URL:          "http://mock-predictor.default.svc.cluster.local/v1",
	}, nil
}

// CanListNamespaces returns mock namespace listing permission check for testing
func (m *TokenKubernetesClientMock) CanListNamespaces(ctx context.Context, identity *integrations.RequestIdentity) (bool, error) {
	// For testing purposes, always return true to allow namespace listing
	// In real scenarios, this would perform a SubjectAccessReview for cluster-scoped namespace access
	return true, nil
}

// GetGuardrailsOrchestratorStatus returns mock GuardrailsOrchestrator status for testing
func (m *TokenKubernetesClientMock) GetGuardrailsOrchestratorStatus(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (*models.GuardrailsStatus, error) {
	return &models.GuardrailsStatus{
		Name:  "guardrails-orchestrator",
		Phase: "Ready",
		Conditions: []gorchv1alpha1.Condition{
			{
				Type:               "Progressing",
				Status:             corev1.ConditionTrue,
				Reason:             "ReconcileInit",
				Message:            "Initializing GuardrailsOrchestrator resource",
				LastTransitionTime: metav1.Now(),
			},
			{
				Type:               "InferenceServiceReady",
				Status:             corev1.ConditionFalse,
				Reason:             "InferenceServiceNotReady",
				Message:            "Inference service is not ready",
				LastTransitionTime: metav1.Now(),
			},
			{
				Type:               "DeploymentReady",
				Status:             corev1.ConditionTrue,
				Reason:             "DeploymentReady",
				Message:            "Deployment is ready",
				LastTransitionTime: metav1.Now(),
			},
			{
				Type:               "RouteReady",
				Status:             corev1.ConditionFalse,
				Reason:             "RouteNotReady",
				Message:            "Route is not ready",
				LastTransitionTime: metav1.Now(),
			},
			{
				Type:               "ReconcileComplete",
				Status:             corev1.ConditionFalse,
				Reason:             "ReconcileFailed",
				Message:            "Reconcile failed",
				LastTransitionTime: metav1.Now(),
			},
		},
	}, nil
}

// GetNemoGuardrailsServiceURL returns a mock NemoGuardrails in-cluster service URL for testing.
// Returns a predictable URL so middleware tests can assert correct client creation.
func (m *TokenKubernetesClientMock) GetNemoGuardrailsServiceURL(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (string, error) {
	return fmt.Sprintf("https://nemoguardrails.%s.svc.cluster.local:443", namespace), nil
}

// GenerateProviderID generates a mock provider ID for testing
// GenerateProviderID delegates to the real implementation to properly count existing providers
func (m *TokenKubernetesClientMock) GenerateProviderID(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (string, error) {
	// Use the real implementation from the embedded TokenKubernetesClient
	return m.TokenKubernetesClient.GenerateProviderID(ctx, identity, namespace)
}

// CreateExternalModelSecret creates a mock Secret for testing
func (m *TokenKubernetesClientMock) CreateExternalModelSecret(ctx context.Context, identity *integrations.RequestIdentity, namespace string, secretName string, secretValue string) error {
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      secretName,
			Namespace: namespace,
		},
		Type: corev1.SecretTypeOpaque,
		StringData: map[string]string{
			"api_key": secretValue,
		},
	}
	return m.Client.Create(ctx, secret)
}

// CreateOrUpdateExternalModelConfigMap delegates to the real implementation
// to properly test the ConfigMap creation logic
func (m *TokenKubernetesClientMock) CreateOrUpdateExternalModelConfigMap(ctx context.Context, identity *integrations.RequestIdentity, namespace string, providerID string, secretName string, req models.ExternalModelRequest) error {
	// Use the real implementation from the embedded TokenKubernetesClient
	return m.TokenKubernetesClient.CreateOrUpdateExternalModelConfigMap(ctx, identity, namespace, providerID, secretName, req)
}

// DeleteExternalModel delegates to the real implementation for proper testing
func (m *TokenKubernetesClientMock) DeleteExternalModel(ctx context.Context, identity *integrations.RequestIdentity, namespace string, modelID string) error {
	// Use the real implementation from the embedded TokenKubernetesClient
	return m.TokenKubernetesClient.DeleteExternalModel(ctx, identity, namespace, modelID)
}

// DeleteSecret deletes a mock Secret for testing
func (m *TokenKubernetesClientMock) DeleteSecret(ctx context.Context, identity *integrations.RequestIdentity, namespace string, secretName string) error {
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      secretName,
			Namespace: namespace,
		},
	}
	return m.Client.Delete(ctx, secret)
}

// CreateNemoGuardrailsResources delegates to the real implementation for testing.
func (m *TokenKubernetesClientMock) CreateNemoGuardrailsResources(ctx context.Context, namespace string) (string, error) {
	return m.TokenKubernetesClient.CreateNemoGuardrailsResources(ctx, namespace)
}

// GetNemoGuardrailsStatus delegates to the real implementation for testing.
func (m *TokenKubernetesClientMock) GetNemoGuardrailsStatus(ctx context.Context, namespace string) (*models.NemoGuardrailsStatus, error) {
	return m.TokenKubernetesClient.GetNemoGuardrailsStatus(ctx, namespace)
}

// GetInferenceServiceURL returns a mock InferenceService URL for the given modelName.
// Returns ("", nil) for unknown names so callers fall back gracefully.
func (m *TokenKubernetesClientMock) GetInferenceServiceURL(_ context.Context, _ *integrations.RequestIdentity, namespace string, modelName string) (string, error) {
	mockURLs := map[string]string{
		"llama-32-3b-instruct": "http://llama-32-3b-instruct-predictor." + namespace + ".svc.cluster.local/v1",
		"llama-guard-3":        "http://llama-guard-3-predictor." + namespace + ".svc.cluster.local/v1",
	}
	if url, ok := mockURLs[modelName]; ok {
		return url, nil
	}
	return "", nil
}
