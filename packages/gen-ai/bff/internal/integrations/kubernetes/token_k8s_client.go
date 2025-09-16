package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models/genaiassets"
	authnv1 "k8s.io/api/authentication/v1"
	authv1 "k8s.io/api/authorization/v1"
	corev1 "k8s.io/api/core/v1"

	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"

	// Import the typed LlamaStackDistribution types
	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
	// Import KServe types
	kservev1alpha1 "github.com/kserve/kserve/pkg/apis/serving/v1alpha1"
	kservev1beta1 "github.com/kserve/kserve/pkg/apis/serving/v1beta1"
)

const (
	// GenAIAssetLabelKey is the label key used to identify GenAI assets
	GenAIAssetLabelKey = "opendatahub.io/genai-asset"

	// ServingRuntime annotation keys
	ServingRuntimeDisplayNameAnnotation = "opendatahub.io/template-display-name"
	ServingRuntimeVersionAnnotation     = "opendatahub.io/runtime-version"
	ServingRuntimeAPIProtocolAnnotation = "opendatahub.io/apiProtocol"

	// InferenceService annotation keys
	InferenceServiceDescriptionAnnotation = "openshift.io/description"
	InferenceServiceUseCaseAnnotation     = "opendatahub.io/genai-use-case"

	// Label for LSD identification
	OpenDataHubDashboardLabelKey = "opendatahub.io/dashboard"
)

type TokenKubernetesClient struct {
	// Move this to a common struct, when we decide to support multiple clients.
	Client client.Client
	Logger *slog.Logger
	Token  integrations.BearerToken
	Config *rest.Config
}

func (kc *TokenKubernetesClient) IsClusterAdmin(ctx context.Context, identity *integrations.RequestIdentity) (bool, error) {
	// Use the passed context instead of creating a new one
	// The caller should control timeout and cancellation

	// We cannot list ClusterRoleBindings here because this client is initialized with a user token,
	// which typically does not have permissions to read cluster-scoped RBAC resources.
	// Instead, we use a SelfSubjectAccessReview with wildcard '*' verb and resource,
	// which safely asks the Kubernetes API server: "Can I do everything?"
	// If the review returns allowed=true, it means the user has cluster-admin-equivalent permissions.
	// Taken from model registry. Move this to shared location.
	sar := &authv1.SelfSubjectAccessReview{
		Spec: authv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authv1.ResourceAttributes{
				Verb:     "*",
				Resource: "*",
			},
		},
	}

	// For SelfSubjectAccessReview, we still need to use the REST client since it's a special case
	// that doesn't work well with the controller-runtime client
	restClient, err := rest.RESTClientFor(kc.Config)
	if err != nil {
		kc.Logger.Error("failed to create REST client for SAR", "error", err)
		return false, fmt.Errorf("failed to create REST client: %w", err)
	}

	// Create the SAR using REST client
	resp := &authv1.SelfSubjectAccessReview{}
	err = restClient.Post().
		Resource("selfsubjectaccessreviews").
		VersionedParams(&metav1.CreateOptions{}, metav1.ParameterCodec).
		Body(sar).
		Do(ctx).
		Into(resp)

	if err != nil {
		kc.Logger.Error("failed to perform cluster-admin SAR", "error", err)
		return false, fmt.Errorf("failed to verify cluster-admin permissions: %w", err)
	}

	if !resp.Status.Allowed {
		return false, nil
	}

	return true, nil
}

func newTokenKubernetesClient(token string, logger *slog.Logger) (*TokenKubernetesClient, error) {
	baseConfig, err := helper.GetKubeconfig()
	if err != nil {
		logger.Error("failed to get kube config", "error", err)
		return nil, fmt.Errorf("failed to get kube config: %w", err)
	}

	// Use CopyConfig for explicit, clean copying
	cfg := rest.CopyConfig(baseConfig)
	cfg.BearerToken = token

	// Explicitly clear all other auth mechanisms
	cfg.BearerTokenFile = ""
	cfg.Username = ""
	cfg.Password = ""
	cfg.ExecProvider = nil
	cfg.AuthProvider = nil

	// Build custom scheme with LlamaStackDistribution types
	scheme, err := helper.BuildScheme()
	if err != nil {
		logger.Error("failed to build scheme", "error", err)
		return nil, fmt.Errorf("failed to build scheme: %w", err)
	}

	// Create controller-runtime client with custom scheme
	ctrlClient, err := client.New(cfg, client.Options{Scheme: scheme})
	if err != nil {
		logger.Error("failed to create token-based Kubernetes client", "error", err)
		return nil, fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	return &TokenKubernetesClient{
		Client: ctrlClient,
		Logger: logger,
		// Token is retained for follow-up calls; do not log it.
		Token:  integrations.NewBearerToken(token),
		Config: cfg,
	}, nil
}

// RequestIdentity is unused because the token already represents the user identity.
// This endpoint is used only on dev mode that is why is safe to ignore permissions errors
func (kc *TokenKubernetesClient) GetNamespaces(ctx context.Context, _ *integrations.RequestIdentity) ([]corev1.Namespace, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Using controller-runtime client - much simpler!
	var nsList corev1.NamespaceList
	err := kc.Client.List(ctx, &nsList)
	if err != nil {
		kc.Logger.Error("user is not allowed to list namespaces or failed to list namespaces")
		return []corev1.Namespace{}, fmt.Errorf("failed to list namespaces: %w", err)
	}

	return nsList.Items, nil
}

func (kc *TokenKubernetesClient) GetLlamaStackDistributions(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (*lsdapi.LlamaStackDistributionList, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	lsdList := &lsdapi.LlamaStackDistributionList{}

	listOptions := &client.ListOptions{
		Namespace: namespace,
		LabelSelector: labels.SelectorFromSet(map[string]string{
			OpenDataHubDashboardLabelKey: "true",
		}),
	}
	err := kc.Client.List(ctx, lsdList, listOptions)
	if err != nil {
		kc.Logger.Error("failed to list LlamaStackDistributions", "error", err, "namespace", namespace)
		return nil, err
	}
	return lsdList, nil
}

func (kc *TokenKubernetesClient) BearerToken() (string, error) {
	return kc.Token.Raw(), nil
}

// GetUser returns the username from a SelfSubjectReview request
func (kc *TokenKubernetesClient) GetUser(ctx context.Context, identity *integrations.RequestIdentity) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Create a new config with the token from the request identity
	config := rest.CopyConfig(kc.Config)
	config.BearerToken = identity.Token
	config.BearerTokenFile = ""

	// Create a kubernetes clientset to use the authentication API
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		kc.Logger.Error("failed to create kubernetes clientset", "error", err)
		return "", fmt.Errorf("failed to create kubernetes clientset: %w", err)
	}

	ssr := &authnv1.SelfSubjectReview{
		TypeMeta: metav1.TypeMeta{
			Kind:       "SelfSubjectReview",
			APIVersion: "authentication.k8s.io/v1",
		},
	}

	resp, err := clientset.AuthenticationV1().SelfSubjectReviews().Create(ctx, ssr, metav1.CreateOptions{})
	if err != nil {
		kc.Logger.Error("failed to get user identity from token", "error", err)
		return "", fmt.Errorf("failed to get user identity: %w", err)
	}

	username := resp.Status.UserInfo.Username
	if username == "" {
		kc.Logger.Error("user identity not found in token")
		return "", fmt.Errorf("no username found in token")
	}

	const saPrefix = "system:serviceaccount:"
	if strings.HasPrefix(username, saPrefix) {
		parts := strings.SplitN(strings.TrimPrefix(username, saPrefix), ":", 2)
		if len(parts) == 2 {
			return parts[1], nil
		}
		kc.Logger.Warn("malformed service account username", "username", username)
	}

	return username, nil
}

func (kc *TokenKubernetesClient) GetConfigMap(ctx context.Context, identity *integrations.RequestIdentity, namespace string, name string) (*corev1.ConfigMap, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	configMap := &corev1.ConfigMap{}
	err := kc.Client.Get(ctx, client.ObjectKey{
		Namespace: namespace,
		Name:      name,
	}, configMap)

	if err != nil {
		kc.Logger.Error("failed to get ConfigMap", "error", err, "namespace", namespace, "name", name)
		return nil, fmt.Errorf("failed to get ConfigMap: %w", err)
	}

	return configMap, nil
}

func (kc *TokenKubernetesClient) GetAAModels(ctx context.Context, identity *integrations.RequestIdentity, namespace string) ([]genaiassets.AAModel, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	labelSelector := labels.SelectorFromSet(labels.Set{
		GenAIAssetLabelKey: "true",
	})

	var inferenceServiceList kservev1beta1.InferenceServiceList
	listOptions := &client.ListOptions{
		Namespace:     namespace,
		LabelSelector: labelSelector,
	}

	err := kc.Client.List(ctx, &inferenceServiceList, listOptions)
	if err != nil {
		kc.Logger.Error("failed to list InferenceServices", "error", err, "namespace", namespace)
		return nil, fmt.Errorf("failed to list InferenceServices: %w", err)
	}

	// Convert InferenceServices to AAModel structs
	var aaModels []genaiassets.AAModel
	for _, isvc := range inferenceServiceList.Items {
		// Extract serving runtime name from the InferenceService
		servingRuntimeName := kc.extractServingRuntimeName(&isvc)

		// Fetch the ServingRuntime resource to get annotations
		servingRuntime, err := kc.getServingRuntime(ctx, namespace, servingRuntimeName)
		if err != nil {
			kc.Logger.Warn("failed to fetch ServingRuntime", "error", err, "servingRuntime", servingRuntimeName)
		}

		aaModel := genaiassets.AAModel{
			ModelName:      isvc.Name,
			ServingRuntime: kc.extractServingRuntimeFromAnnotations(servingRuntime),
			APIProtocol:    kc.extractAPIProtocolFromAnnotations(servingRuntime),
			Version:        kc.extractVersionFromAnnotations(servingRuntime),
			Description:    kc.extractDescriptionFromInferenceService(&isvc),
			Usecase:        kc.extractUseCaseFromInferenceService(&isvc),
			Endpoints:      kc.extractEndpoints(&isvc),
		}
		aaModels = append(aaModels, aaModel)
	}

	kc.Logger.Info("successfully fetched AAModels", "count", len(aaModels), "namespace", namespace)
	return aaModels, nil
}

// Helper method to extract serving runtime name from InferenceService
func (kc *TokenKubernetesClient) extractServingRuntimeName(isvc *kservev1beta1.InferenceService) string {
	if isvc.Spec.Predictor.Model != nil {
		return *isvc.Spec.Predictor.Model.Runtime
	}
	return ""
}

// Helper method to fetch ServingRuntime resource
func (kc *TokenKubernetesClient) getServingRuntime(ctx context.Context, namespace, name string) (*kservev1alpha1.ServingRuntime, error) {
	var servingRuntime kservev1alpha1.ServingRuntime
	key := client.ObjectKey{
		Namespace: namespace,
		Name:      name,
	}
	err := kc.Client.Get(ctx, key, &servingRuntime)
	if err != nil {
		return nil, err
	}
	return &servingRuntime, nil
}

// Helper method to extract serving runtime display name from annotations
func (kc *TokenKubernetesClient) extractServingRuntimeFromAnnotations(sr *kservev1alpha1.ServingRuntime) string {
	if sr == nil || sr.Annotations == nil {
		return ""
	}
	return sr.Annotations[ServingRuntimeDisplayNameAnnotation]
}

// Helper method to extract API protocol from annotations
func (kc *TokenKubernetesClient) extractAPIProtocolFromAnnotations(sr *kservev1alpha1.ServingRuntime) string {
	if sr == nil || sr.Annotations == nil {
		return ""
	}
	return sr.Annotations[ServingRuntimeAPIProtocolAnnotation]
}

// Helper method to extract version from annotations
func (kc *TokenKubernetesClient) extractVersionFromAnnotations(sr *kservev1alpha1.ServingRuntime) string {
	if sr == nil || sr.Annotations == nil {
		return ""
	}
	return sr.Annotations[ServingRuntimeVersionAnnotation]
}

// Helper method to extract description from InferenceService annotations
func (kc *TokenKubernetesClient) extractDescriptionFromInferenceService(isvc *kservev1beta1.InferenceService) string {
	if isvc == nil || isvc.Annotations == nil {
		return ""
	}
	return isvc.Annotations[InferenceServiceDescriptionAnnotation]
}

// Helper method to extract use case from InferenceService annotations
func (kc *TokenKubernetesClient) extractUseCaseFromInferenceService(isvc *kservev1beta1.InferenceService) string {
	if isvc == nil || isvc.Annotations == nil {
		return ""
	}
	return isvc.Annotations[InferenceServiceUseCaseAnnotation]
}

// Helper method to extract endpoints from InferenceService
func (kc *TokenKubernetesClient) extractEndpoints(isvc *kservev1beta1.InferenceService) []string {
	endpoints := []string{}

	// Extract internal endpoint from Address
	if isvc.Status.Address != nil && isvc.Status.Address.URL != nil {
		internal := isvc.Status.Address.URL.String()
		endpoints = append(endpoints, fmt.Sprintf("internal: %s", internal))
	}

	// Extract external endpoint from URL
	if isvc.Status.URL != nil {
		external := isvc.Status.URL.String()
		// Only add if it's different from internal
		if len(endpoints) == 0 || !strings.Contains(endpoints[0], external) {
			endpoints = append(endpoints, fmt.Sprintf("external: %s", external))
		}
	}
	return endpoints
}

func (kc *TokenKubernetesClient) InstallLlamaStackDistribution(ctx context.Context, identity *integrations.RequestIdentity, namespace string, models []string) (*lsdapi.LlamaStackDistribution, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	// Step 1: Create LlamaStackDistribution resource first
	lsdName := "lsd-genai-playground"
	configMapName := "llama-stack-config"
	lsd := &lsdapi.LlamaStackDistribution{
		ObjectMeta: metav1.ObjectMeta{
			Name:      lsdName,
			Namespace: namespace,
			Labels: map[string]string{
				OpenDataHubDashboardLabelKey: "true",
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
						{
							Name:  "VLLM_TLS_VERIFY",
							Value: "false",
						},
						{
							Name:  "MILVUS_DB_PATH",
							Value: "~/.llama/milvus.db",
						},
						{
							Name:  "FMS_ORCHESTRATOR_URL",
							Value: "http://localhost",
						},
						{
							Name:  "VLLM_MAX_TOKENS",
							Value: "4096",
						},
					},
					Name: "llama-stack",
					Port: 8321,
				},
				Distribution: lsdapi.DistributionType{
					Name: "rh-dev",
				},
				UserConfig: &lsdapi.UserConfigSpec{
					ConfigMapName: configMapName,
				},
			},
		},
	}

	// Create the LlamaStackDistribution
	if err := kc.Client.Create(ctx, lsd); err != nil {
		kc.Logger.Error("failed to create LlamaStackDistribution", "error", err, "namespace", namespace, "lsdName", lsdName)
		return nil, fmt.Errorf("failed to create LlamaStackDistribution: %w", err)
	}

	kc.Logger.Info("LlamaStackDistribution created successfully", "namespace", namespace, "lsdName", lsdName, "models", models)

	// Step 2: Create ConfigMap with owner reference to the LSD
	if err := kc.createConfigMapWithOwnerReference(ctx, namespace, configMapName, lsdName, models, lsd); err != nil {
		// If ConfigMap creation fails, we should clean up the LSD
		kc.Logger.Error("failed to create ConfigMap with owner reference", "error", err)
		// Note: In a production environment, you might want to delete the LSD here
		// For now, we'll return the error but keep the LSD
		return nil, fmt.Errorf("failed to create ConfigMap: %w", err)
	}

	return lsd, nil
}

// createConfigMapWithOwnerReference creates a ConfigMap and sets up owner reference to LSD
func (kc *TokenKubernetesClient) createConfigMapWithOwnerReference(ctx context.Context, namespace, configMapName, lsdName string, models []string, lsd *lsdapi.LlamaStackDistribution) error {
	// Step 1: Create ConfigMap with models configuration
	runYAML, err := kc.generateLlamaStackConfig(ctx, namespace, models)
	if err != nil {
		kc.Logger.Error("failed to generate Llama Stack configuration", "error", err, "namespace", namespace)
		return fmt.Errorf("failed to generate Llama Stack configuration: %w", err)
	}

	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      configMapName,
			Namespace: namespace,
			Labels: map[string]string{
				OpenDataHubDashboardLabelKey: "true",
				"llamastack.io/distribution": lsdName,
			},
		},
		Data: map[string]string{
			"run.yaml": runYAML,
		},
	}

	// Create the ConfigMap
	if err := kc.Client.Create(ctx, configMap); err != nil {
		kc.Logger.Error("failed to create ConfigMap", "error", err, "namespace", namespace, "configMapName", configMapName)
		return fmt.Errorf("failed to create ConfigMap: %w", err)
	}

	kc.Logger.Info("ConfigMap created successfully", "namespace", namespace, "configMapName", configMapName)

	// Step 2: Update ConfigMap with owner reference to the LSD
	configMap.OwnerReferences = []metav1.OwnerReference{
		{
			APIVersion:         "llamastack.io/v1alpha1",
			Kind:               "LlamaStackDistribution",
			Name:               lsdName,
			UID:                lsd.UID,
			Controller:         &[]bool{true}[0],
			BlockOwnerDeletion: &[]bool{true}[0],
		},
	}

	if err := kc.Client.Update(ctx, configMap); err != nil {
		kc.Logger.Error("failed to update ConfigMap with owner reference", "error", err, "namespace", namespace, "configMapName", configMapName)
		// Don't fail the entire operation, just log the warning
		kc.Logger.Warn("ConfigMap will not be automatically garbage collected when LSD is deleted")
		return fmt.Errorf("failed to update ConfigMap with owner reference: %w", err)
	}

	kc.Logger.Info("ConfigMap updated with owner reference", "namespace", namespace, "configMapName", configMapName, "owner", lsdName)
	return nil
}

// generateLlamaStackConfig generates the Llama Stack configuration YAML
func (kc *TokenKubernetesClient) generateLlamaStackConfig(ctx context.Context, namespace string, models []string) (string, error) {
	// Generate models section and providers section dynamically from the provided models
	modelsYAML := ""
	providersYAML := ""

	for i, model := range models {
		// Query serving runtime and inference service to get actual model details
		modelDetails, err := kc.getModelDetailsFromServingRuntime(ctx, namespace, model)
		if err != nil {
			kc.Logger.Error("failed to get model details from serving runtime", "model", model, "error", err)
			return "", fmt.Errorf("cannot determine endpoint for model '%s': %w", model, err)
		}

		// Extract details from the model configuration
		modelID := modelDetails["model_id"].(string)
		providerID := fmt.Sprintf("vllm-inference-%d", i+1) // Create unique provider ID for each model
		modelType := modelDetails["model_type"].(string)
		endpointURL := modelDetails["endpoint_url"].(string)
		metadata := modelDetails["metadata"].(map[string]interface{})

		// Convert metadata to YAML format
		metadataYAML := ""
		if len(metadata) > 0 {
			metadataYAML = "\n    metadata:\n"
			for key, value := range metadata {
				metadataYAML += fmt.Sprintf("      %s: %v\n", key, value)
			}
		} else {
			metadataYAML = "\n    metadata: {}"
		}

		// Add model to models section
		modelsYAML += fmt.Sprintf(`  -%s
    model_id: %s
    provider_id: %s
    model_type: %s
`, metadataYAML, modelID, providerID, modelType)

		// Add provider to providers section
		providersYAML += fmt.Sprintf(`  - provider_id: %s
    provider_type: remote::vllm
    config:
      url: %s
      max_tokens: ${env.VLLM_MAX_TOKENS:=4096}
      api_token: ${env.VLLM_API_TOKEN:=fake}
      tls_verify: ${env.VLLM_TLS_VERIFY:=true}
`, providerID, endpointURL)
	}

	config := fmt.Sprintf(`# Llama Stack Configuration
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
%s  - provider_id: sentence-transformers
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
%s
shields: []
vector_dbs: []
datasets: []
scoring_fns: []
benchmarks: []
tool_groups:
- toolgroup_id: builtin::rag
  provider_id: rag-runtime
server:
  port: 8321`, providersYAML, modelsYAML)

	return config, nil
}

// getModelDetailsFromServingRuntime queries the serving runtime and inference service
// to get detailed model configuration information
func (kc *TokenKubernetesClient) getModelDetailsFromServingRuntime(ctx context.Context, namespace string, modelID string) (map[string]interface{}, error) {
	// Find InferenceService by display name
	targetISVC, err := kc.findInferenceServiceByDisplayName(ctx, namespace, modelID)
	if err != nil {
		kc.Logger.Error("failed to find InferenceService for model", "modelID", modelID, "error", err)
		return nil, fmt.Errorf("InferenceService for model '%s' not found: %w", modelID, err)
	}

	// Extract the internal URL from the InferenceService status
	// Use Status.URL which is already the internal HTTP address
	if targetISVC.Status.URL == nil {
		kc.Logger.Error("InferenceService has no internal URL", "name", targetISVC.Name, "namespace", namespace)
		return nil, fmt.Errorf("InferenceService '%s' has no internal URL - service may not be ready", targetISVC.Name)
	}

	// Convert URL pointer to string
	internalURL := targetISVC.Status.URL.String()

	// Check if port is already present (look for :port pattern after the hostname)
	// We need to check for :port after the hostname, not just any colon (http:// has a colon)
	if !strings.Contains(internalURL, ".svc.cluster.local:") {
		internalURL = internalURL + ":8080"
	}

	// Add /v1 suffix if not present
	if !strings.HasSuffix(internalURL, "/v1") {
		internalURL = internalURL + "/v1"
	}

	// Extract additional metadata from the InferenceService
	metadata := map[string]interface{}{}
	if targetISVC.Annotations != nil {
		if displayName, exists := targetISVC.Annotations["openshift.io/display-name"]; exists {
			metadata["display_name"] = displayName
		}
		if description, exists := targetISVC.Annotations["openshift.io/description"]; exists {
			metadata["description"] = description
		}
	}

	// All models are LLM models using vllm-inference
	providerID := "vllm-inference"
	modelType := "llm"

	return map[string]interface{}{
		"model_id":     strings.ReplaceAll(modelID, ":", "-"),
		"provider_id":  providerID,
		"model_type":   modelType,
		"metadata":     metadata,
		"endpoint_url": internalURL,
	}, nil
}

// findInferenceServiceByDisplayName finds an InferenceService by its display name annotation
func (kc *TokenKubernetesClient) findInferenceServiceByDisplayName(ctx context.Context, namespace, modelName string) (*kservev1beta1.InferenceService, error) {
	// List all InferenceServices in the namespace
	var isvcList kservev1beta1.InferenceServiceList
	err := kc.Client.List(ctx, &isvcList, client.InNamespace(namespace))
	if err != nil {
		kc.Logger.Error("failed to list InferenceServices", "error", err, "namespace", namespace)
		return nil, fmt.Errorf("failed to list InferenceServices in namespace %s: %w", namespace, err)
	}

	// Find InferenceService with matching display name annotation
	for _, isvc := range isvcList.Items {
		if isvc.Annotations["openshift.io/display-name"] == modelName {
			kc.Logger.Info("found InferenceService by display name", "modelName", modelName, "isvcName", isvc.Name, "namespace", namespace)
			return &isvc, nil
		}
	}

	return nil, fmt.Errorf("InferenceService with display name '%s' not found in namespace %s", modelName, namespace)
}
