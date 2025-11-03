package kubernetes

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas"
	"github.com/opendatahub-io/gen-ai/internal/models"
	genaitypes "github.com/opendatahub-io/gen-ai/internal/types"
	authnv1 "k8s.io/api/authentication/v1"
	authv1 "k8s.io/api/authorization/v1"
	corev1 "k8s.io/api/core/v1"

	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
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
	DisplayNameAnnotation               = "openshift.io/display-name"

	// InferenceService annotation keys
	InferenceServiceDescriptionAnnotation = "openshift.io/description"
	InferenceServiceUseCaseAnnotation     = "opendatahub.io/genai-use-case"

	// Gen-ai playground LLS distribution name
	lsdName = "lsd-genai-playground"

	// Label for LSD identification
	OpenDataHubDashboardLabelKey = "opendatahub.io/dashboard"
)

type TokenKubernetesClient struct {
	// Move this to a common struct, when we decide to support multiple clients.
	Client    client.Client
	Logger    *slog.Logger
	Token     integrations.BearerToken
	Config    *rest.Config
	EnvConfig config.EnvConfig
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

func newTokenKubernetesClient(token string, logger *slog.Logger, envConfig config.EnvConfig) (*TokenKubernetesClient, error) {
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
		Token:     integrations.NewBearerToken(token),
		Config:    cfg,
		EnvConfig: envConfig,
	}, nil
}

// GetNamespaces returns namespaces accessible to the user.
// For cluster admins, returns all namespaces.
// For regular users, uses OpenShift Projects API which returns only accessible projects.
func (kc *TokenKubernetesClient) GetNamespaces(ctx context.Context, identity *integrations.RequestIdentity) ([]corev1.Namespace, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Check for nil identity
	if identity == nil {
		kc.Logger.Error("identity is nil")
		return nil, fmt.Errorf("identity cannot be nil")
	}

	// Create a dynamic client with user token
	userConfig := rest.CopyConfig(kc.Config)
	userConfig.BearerToken = identity.Token
	userConfig.BearerTokenFile = ""

	// Create controller-runtime client with user token
	userClient, err := client.New(userConfig, client.Options{Scheme: kc.Client.Scheme()})
	if err != nil {
		kc.Logger.Error("failed to create user client", "error", err)
		return nil, fmt.Errorf("failed to create user client: %w", err)
	}

	// Try cluster-wide namespace list first (works for admins)
	var nsList corev1.NamespaceList
	err = userClient.List(ctx, &nsList)
	if err == nil {
		// User can list namespaces cluster-wide (admin path)
		kc.Logger.Debug("user can list namespaces cluster-wide",
			"count", len(nsList.Items))
		return nsList.Items, nil
	}

	// User cannot list cluster-wide, use OpenShift Projects API
	// This API returns only projects the user has access to
	kc.Logger.Debug("falling back to OpenShift Projects API", "error", err)

	// Use Unstructured to query project.openshift.io/v1 projects
	projectList := &unstructured.UnstructuredList{}
	projectList.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "project.openshift.io",
		Version: "v1",
		Kind:    "ProjectList",
	})

	err = userClient.List(ctx, projectList)
	if err != nil {
		kc.Logger.Error("failed to list OpenShift projects", "error", err)
		return nil, fmt.Errorf("failed to list projects: %w", err)
	}

	// Convert projects to namespaces
	namespaces := make([]corev1.Namespace, 0, len(projectList.Items))
	for _, project := range projectList.Items {
		projectName := project.GetName()

		// Fetch full namespace object
		ns := &corev1.Namespace{}
		err := userClient.Get(ctx, types.NamespacedName{Name: projectName}, ns)
		if err != nil {
			kc.Logger.Warn("failed to get namespace details", "namespace", projectName, "error", err)
			// Create minimal namespace if we can't fetch full details
			namespaces = append(namespaces, corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name:        projectName,
					Annotations: project.GetAnnotations(),
					Labels:      project.GetLabels(),
				},
			})
		} else {
			namespaces = append(namespaces, *ns)
		}
	}

	kc.Logger.Debug("listed namespaces via OpenShift Projects API",
		"count", len(namespaces))

	return namespaces, nil
}

// CanListNamespaces performs a SubjectAccessReview to check if the user has permission to list namespaces
// This is a cluster-scoped operation, so no namespace is specified in the SAR
func (kc *TokenKubernetesClient) CanListNamespaces(ctx context.Context, identity *integrations.RequestIdentity) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Check for nil identity
	if identity == nil {
		kc.Logger.Error("identity is nil")
		return false, fmt.Errorf("identity cannot be nil")
	}

	// Create a new config with the token from the request identity
	config := rest.CopyConfig(kc.Config)
	config.BearerToken = identity.Token
	config.BearerTokenFile = ""

	// Create a kubernetes clientset to use the authorization API
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		kc.Logger.Error("failed to create kubernetes clientset for SAR", "error", err)
		return false, fmt.Errorf("failed to create kubernetes clientset: %w", err)
	}

	// Create SelfSubjectAccessReview to check if user can list namespaces (cluster-scoped)
	sar := &authv1.SelfSubjectAccessReview{
		Spec: authv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authv1.ResourceAttributes{
				Verb:      "list",
				Group:     "",
				Resource:  "namespaces",
				Namespace: "", // Cluster-scoped operation
			},
		},
	}

	resp, err := clientset.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		kc.Logger.Error("failed to perform namespaces list SAR", "error", err)
		return false, fmt.Errorf("failed to verify namespaces list permissions: %w", err)
	}

	return resp.Status.Allowed, nil
}

// CanListLlamaStackDistributions performs a SubjectAccessReview to check if the user has permission to list LlamaStackDistribution resources
func (kc *TokenKubernetesClient) CanListLlamaStackDistributions(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Check for nil identity
	if identity == nil {
		kc.Logger.Error("identity is nil")
		return false, fmt.Errorf("identity cannot be nil")
	}

	// Create a new config with the token from the request identity
	config := rest.CopyConfig(kc.Config)
	config.BearerToken = identity.Token
	config.BearerTokenFile = ""

	// Create a kubernetes clientset to use the authorization API
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		kc.Logger.Error("failed to create kubernetes clientset for SAR", "error", err)
		return false, fmt.Errorf("failed to create kubernetes clientset: %w", err)
	}

	// Create SelfSubjectAccessReview to check if user can list LlamaStackDistribution resources
	sar := &authv1.SelfSubjectAccessReview{
		Spec: authv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authv1.ResourceAttributes{
				Verb:      "list",
				Group:     "llamastack.io",
				Resource:  "llamastackdistributions",
				Namespace: namespace,
			},
		},
	}

	resp, err := clientset.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		kc.Logger.Error("failed to perform LlamaStackDistribution list SAR", "error", err)
		return false, fmt.Errorf("failed to verify LlamaStackDistribution list permissions: %w", err)
	}

	return resp.Status.Allowed, nil
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

func (kc *TokenKubernetesClient) GetAAModels(ctx context.Context, identity *integrations.RequestIdentity, namespace string) ([]models.AAModel, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	labelSelector := labels.SelectorFromSet(labels.Set{
		GenAIAssetLabelKey: "true",
	})

	// Convert InferenceServices to AAModel structs
	aaModelsFromInfSvc, err := kc.getAAModelsFromInferenceService(ctx, namespace, labelSelector)
	if err != nil {
		return nil, err
	}

	// Convert LLMInferenceServices to AAModel structs
	aaModelsFromLLMInfSvc, err := kc.getAAModelsFromLLMInferenceService(ctx, namespace, labelSelector)
	if err != nil {
		return nil, err
	}

	// Combine both lists
	var allAAModels []models.AAModel
	allAAModels = append(allAAModels, aaModelsFromInfSvc...)
	allAAModels = append(allAAModels, aaModelsFromLLMInfSvc...)

	kc.Logger.Info("successfully fetched AAModels", "count", len(allAAModels), "namespace", namespace, "inferenceServices", len(aaModelsFromInfSvc), "llmInferenceServices", len(aaModelsFromLLMInfSvc))
	return allAAModels, nil
}

func (kc *TokenKubernetesClient) getAAModelsFromLLMInferenceService(ctx context.Context, namespace string, labelSelector labels.Selector) ([]models.AAModel, error) {
	var llmInferenceServiceList kservev1alpha1.LLMInferenceServiceList
	listOptions := &client.ListOptions{
		Namespace:     namespace,
		LabelSelector: labelSelector,
	}

	err := kc.Client.List(ctx, &llmInferenceServiceList, listOptions)
	if err != nil {
		kc.Logger.Error("failed to list LLMInferenceServices", "error", err, "namespace", namespace)
		return nil, fmt.Errorf("failed to list LLMInferenceServices: %w", err)
	}

	var aaModels []models.AAModel
	for _, llmSvc := range llmInferenceServiceList.Items {

		aaModel := models.AAModel{
			ModelName:      llmSvc.Name,
			ModelID:        *llmSvc.Spec.Model.Name,
			Description:    kc.extractDescriptionFromLLMInferenceService(&llmSvc),
			ServingRuntime: "Distributed Inference Server with llm-d",
			APIProtocol:    "REST",
			Usecase:        kc.extractUseCaseFromLLMInferenceService(&llmSvc),
			Endpoints:      kc.extractEndpointsFromLLMInferenceService(&llmSvc),
			Status:         kc.extractStatusFromLLMInferenceService(&llmSvc),
			DisplayName:    kc.extractDisplayNameFromLLMInferenceService(&llmSvc),
		}
		aaModels = append(aaModels, aaModel)
	}
	return aaModels, nil
}

// getAAModelsFromInferenceService converts a list of InferenceServices to AAModel structs
func (kc *TokenKubernetesClient) getAAModelsFromInferenceService(ctx context.Context, namespace string, labelSelector labels.Selector) ([]models.AAModel, error) {
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
	var aaModels []models.AAModel
	for _, isvc := range inferenceServiceList.Items {
		// Extract serving runtime name from the InferenceService
		servingRuntimeName := kc.extractServingRuntimeName(&isvc)

		// Fetch the ServingRuntime resource to get annotations
		servingRuntime, err := kc.getServingRuntime(ctx, namespace, servingRuntimeName)
		if err != nil {
			kc.Logger.Warn("failed to fetch ServingRuntime", "error", err, "servingRuntime", servingRuntimeName)
		}

		aaModel := models.AAModel{
			ModelName:      isvc.Name,
			ModelID:        isvc.Name,
			ServingRuntime: kc.extractServingRuntimeFromAnnotations(servingRuntime),
			APIProtocol:    kc.extractAPIProtocolFromAnnotations(servingRuntime),
			Version:        kc.extractVersionFromAnnotations(servingRuntime),
			Description:    kc.extractDescriptionFromInferenceService(&isvc),
			Usecase:        kc.extractUseCaseFromInferenceService(&isvc),
			Endpoints:      kc.extractEndpoints(&isvc),
			Status:         kc.extractStatusFromInferenceService(&isvc),
			DisplayName:    kc.extractDisplayNameFromInferenceService(&isvc),
		}
		aaModels = append(aaModels, aaModel)
	}
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

	if isvc == nil {
		return endpoints
	}

	// Extract internal endpoint from Address
	if isvc.Status.Address != nil && isvc.Status.Address.URL != nil {
		internal := isvc.Status.Address.URL.String()
		endpoints = append(endpoints, fmt.Sprintf("internal: %s", internal))
	}

	// Extract external endpoint from URL
	if isvc.Status.URL != nil {
		external := isvc.Status.URL.String()
		if strings.Contains(external, ".svc.cluster.local") {
			return endpoints
		}
		// Only add if it's different from internal and not internal service
		if len(endpoints) == 0 || !strings.Contains(endpoints[0], external) {
			endpoints = append(endpoints, fmt.Sprintf("external: %s", external))
		}
	}
	return endpoints
}

// extractStatusFromInferenceService consolidates all KServe status information into "Running" or "Error"
func (kc *TokenKubernetesClient) extractStatusFromInferenceService(isvc *kservev1beta1.InferenceService) string {
	return ExtractStatusFromInferenceService(isvc)
}

// ExtractStatusFromInferenceService is a pure function that extracts status from InferenceService
// This function is exported for testing purposes
func ExtractStatusFromInferenceService(isvc *kservev1beta1.InferenceService) string {
	// Simply check if the overall service is ready
	for _, condition := range isvc.Status.Conditions {
		if condition.Type == "Ready" && condition.Status == "True" {
			return "Running"
		}
	}
	return "Stop"
}

func (kc *TokenKubernetesClient) extractDisplayNameFromInferenceService(isvc *kservev1beta1.InferenceService) string {
	if isvc == nil || isvc.Annotations == nil {
		return ""
	}
	// If display name is not present, use the inference service name
	displayName := isvc.Annotations[DisplayNameAnnotation]
	if displayName == "" {
		return isvc.Name
	}
	return displayName
}

// Helper method to find the service account and secret
func (kc *TokenKubernetesClient) findServiceAccountAndSecret(ctx context.Context, namespace, serviceName, serviceKind string) (string, string) {
	// List service accounts in the namespace
	var saList corev1.ServiceAccountList
	err := kc.Client.List(ctx, &saList, client.InNamespace(namespace))
	if err != nil {
		kc.Logger.Warn("failed to list service accounts", "error", err, "namespace", namespace)
		return "", ""
	}

	// Find service account with owner reference to this service
	for _, sa := range saList.Items {
		for _, ownerRef := range sa.OwnerReferences {
			if ownerRef.Kind == serviceKind && ownerRef.Name == serviceName {
				kc.Logger.Debug("Found service account with owner reference",
					"serviceAccount", sa.Name,
					"serviceName", serviceName,
					"serviceKind", serviceKind)

				// Find the secret associated with this service account
				secretName := kc.findSecretForServiceAccount(ctx, namespace, sa.Name)
				return sa.Name, secretName
			}
		}
	}

	// If no service account found with owner reference, use default
	kc.Logger.Debug("no service account found with owner reference, using default",
		"serviceName", serviceName,
		"serviceKind", serviceKind)
	secretName := kc.findSecretForServiceAccount(ctx, namespace, "default")
	return "default", secretName
}

// Helper method to find the actual service account and secret used by InferenceService
func (kc *TokenKubernetesClient) findServiceAccountAndSecretForInferenceService(ctx context.Context, isvc *kservev1beta1.InferenceService) (string, string) {
	return kc.findServiceAccountAndSecret(ctx, isvc.Namespace, isvc.Name, "InferenceService")
}

// Helper method to find the actual service account and secret used by LLMInferenceService
func (kc *TokenKubernetesClient) findServiceAccountAndSecretForLLMInferenceService(ctx context.Context, llmSvc *kservev1alpha1.LLMInferenceService) (string, string) {
	return kc.findServiceAccountAndSecret(ctx, llmSvc.Namespace, llmSvc.Name, "LLMInferenceService")
}

// Helper method to find the secret containing the service account token
func (kc *TokenKubernetesClient) findSecretForServiceAccount(ctx context.Context, namespace, serviceAccountName string) string {
	// List secrets in the namespace
	var secretList corev1.SecretList
	err := kc.Client.List(ctx, &secretList, client.InNamespace(namespace))
	if err != nil {
		kc.Logger.Warn("failed to list secrets", "error", err, "namespace", namespace)
		return serviceAccountName + "-token"
	}

	// Find secret with the service account annotation
	for _, secret := range secretList.Items {
		if secret.Type == corev1.SecretTypeServiceAccountToken {
			if saName, exists := secret.Annotations["kubernetes.io/service-account.name"]; exists && saName == serviceAccountName {
				kc.Logger.Debug("Found service account token secret",
					"serviceAccount", serviceAccountName,
					"secretName", secret.Name)
				return secret.Name
			}
		}
	}

	// If no secret found, return empty string to indicate no secret exists
	kc.Logger.Debug("no service account token secret found",
		"serviceAccount", serviceAccountName)
	return ""
}

// Helper method to extract description from LLMInferenceService annotations
func (kc *TokenKubernetesClient) extractDescriptionFromLLMInferenceService(llmSvc *kservev1alpha1.LLMInferenceService) string {
	if llmSvc == nil || llmSvc.Annotations == nil {
		return ""
	}
	return llmSvc.Annotations[InferenceServiceDescriptionAnnotation]
}

// Helper method to extract use case from LLMInferenceService annotations
func (kc *TokenKubernetesClient) extractUseCaseFromLLMInferenceService(llmSvc *kservev1alpha1.LLMInferenceService) string {
	if llmSvc == nil || llmSvc.Annotations == nil {
		return ""
	}
	return llmSvc.Annotations[InferenceServiceUseCaseAnnotation]
}

// Helper method to extract endpoints from LLMInferenceService
func (kc *TokenKubernetesClient) extractEndpointsFromLLMInferenceService(llmSvc *kservev1alpha1.LLMInferenceService) []string {
	endpoints := []string{}

	if llmSvc == nil {
		return endpoints
	}

	// Extract internal endpoint from Address
	if llmSvc.Status.Address != nil && llmSvc.Status.Address.URL != nil {
		internal := llmSvc.Status.Address.URL.String()
		endpoints = append(endpoints, fmt.Sprintf("internal: %s", internal))
	}

	// Extract external endpoint from URL
	if llmSvc.Status.URL != nil {
		external := llmSvc.Status.URL.String()
		if strings.Contains(external, ".svc.cluster.local") {
			return endpoints
		}
		// Only add if it's different from internal and not internal service
		if len(endpoints) == 0 || !strings.Contains(endpoints[0], external) {
			endpoints = append(endpoints, fmt.Sprintf("external: %s", external))
		}
	}
	return endpoints
}

// Helper method to extract status from LLMInferenceService
func (kc *TokenKubernetesClient) extractStatusFromLLMInferenceService(llmSvc *kservev1alpha1.LLMInferenceService) string {
	// Simply check if the overall service is ready
	for _, condition := range llmSvc.Status.Conditions {
		if condition.Type == "Ready" && condition.Status == "True" {
			return "Running"
		}
	}
	return "Stop"
}

// Helper method to extract display name from LLMInferenceService annotations
func (kc *TokenKubernetesClient) extractDisplayNameFromLLMInferenceService(llmSvc *kservev1alpha1.LLMInferenceService) string {
	if llmSvc == nil || llmSvc.Annotations == nil {
		return ""
	}
	// If display name is not present, use the LLM inference service name
	displayName := llmSvc.Annotations[DisplayNameAnnotation]
	if displayName == "" {
		return llmSvc.Name
	}
	return displayName
}

func (kc *TokenKubernetesClient) InstallLlamaStackDistribution(ctx context.Context, identity *integrations.RequestIdentity, namespace string, models []models.InstallModel, maasClient maas.MaaSClientInterface) (*lsdapi.LlamaStackDistribution, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	// Check if LSD already exists in the namespace
	existingLSDList, err := kc.GetLlamaStackDistributions(ctx, identity, namespace)
	if err != nil {
		return nil, fmt.Errorf("failed to check for existing LlamaStackDistribution: %w", err)
	}

	if len(existingLSDList.Items) > 0 {
		return nil, fmt.Errorf("LlamaStackDistribution already exists in namespace %s", namespace)
	}

	// Step 1: Collect existing service account token secrets for each model
	type modelSecretInfo struct {
		secretName string
		tokenKey   string
		hasToken   bool
	}

	modelSecrets := make(map[string]modelSecretInfo)

	for _, model := range models {
		var (
			secretName string
			foundType  string
		)
		// First try to find InferenceService
		if targetISVC, err := kc.findInferenceServiceByModelName(ctx, namespace, model.ModelName); err == nil {
			// Find the actual secret name and key used by the InferenceService
			_, secretName = kc.findServiceAccountAndSecretForInferenceService(ctx, targetISVC)
			foundType = "InferenceService"
			// If InferenceService not found, try LLMInferenceService
		} else if targetLLMSvc, err := kc.findLLMInferenceServiceByModelName(ctx, namespace, model.ModelName); err == nil {
			// Find the actual secret name and key used by the LLMInferenceService
			_, secretName = kc.findServiceAccountAndSecretForLLMInferenceService(ctx, targetLLMSvc)
			foundType = "LLMInferenceService"
		}
		if foundType != "" {
			modelSecrets[model.ModelName] = modelSecretInfo{
				secretName: secretName,
				tokenKey:   "token", // Service account token secrets always use "token" as the key
				hasToken:   secretName != "",
			}
			if secretName != "" {
				kc.Logger.Info("found existing "+foundType+" service account token secret", "model", model.ModelName, "isMaaSModel", model.IsMaaSModel, "secretName", secretName, "hasToken", true)
			} else {
				kc.Logger.Info("found "+foundType+" but no service account token secret", "model", model.ModelName, "isMaaSModel", model.IsMaaSModel, "hasToken", false)
			}
		} else {
			kc.Logger.Debug("could not find InferenceService or LLMInferenceService for model, will use default", "model", model.ModelName, "isMaaSModel", model.IsMaaSModel)
		}
	}

	// Step 2: Set up environment variables (including tokens from secret)
	envVars := []corev1.EnvVar{
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
	}

	// Add token environment variables from existing secrets
	for i, model := range models {
		envVarName := fmt.Sprintf("VLLM_API_TOKEN_%d", i+1)

		if secretInfo, exists := modelSecrets[model.ModelName]; exists && secretInfo.hasToken && secretInfo.secretName != "" {
			// Only reference the secret if it actually exists and has a valid name
			// Check if the secret actually exists before referencing it
			var secret corev1.Secret
			err := kc.Client.Get(ctx, types.NamespacedName{Name: secretInfo.secretName, Namespace: namespace}, &secret)
			if err == nil {
				// Reference the existing service account token secret
				envVars = append(envVars, corev1.EnvVar{
					Name: envVarName,
					ValueFrom: &corev1.EnvVarSource{
						SecretKeyRef: &corev1.SecretKeySelector{
							LocalObjectReference: corev1.LocalObjectReference{
								Name: secretInfo.secretName,
							},
							Key: secretInfo.tokenKey,
						},
					},
				})
				kc.Logger.Info("Referencing existing service account token secret", "model", model.ModelName, "envVar", envVarName, "secretName", secretInfo.secretName)
			} else {
				// Secret doesn't exist, use default token
				envVars = append(envVars, corev1.EnvVar{
					Name:  envVarName,
					Value: "fake",
				})
				kc.Logger.Warn("service account token secret not found, using default token", "model", model.ModelName, "envVar", envVarName, "secretName", secretInfo.secretName, "error", err)
			}
		} else {
			// Set default token for models without authentication
			envVars = append(envVars, corev1.EnvVar{
				Name:  envVarName,
				Value: "fake",
			})
			kc.Logger.Debug("no token found for model, using default", "model", model.ModelName, "envVar", envVarName)
		}
	}

	// Step 2: Create LlamaStackDistribution resource first
	configMapName := "llama-stack-config"
	lsd := &lsdapi.LlamaStackDistribution{
		ObjectMeta: metav1.ObjectMeta{
			Name:      lsdName,
			Namespace: namespace,
			Annotations: map[string]string{
				DisplayNameAnnotation: lsdName,
			},
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
					Env: append(envVars, corev1.EnvVar{
						Name:  "LLAMA_STACK_CONFIG_DIR",
						Value: "/opt/app-root/src/.llama/distributions/rh/",
					}),
					Name: "llama-stack",
					Port: 8321,
				},
				Distribution: func() lsdapi.DistributionType {
					// Check if distributionName contains registry patterns indicating it's a container image
					name := kc.EnvConfig.DistributionName
					if strings.Contains(name, "/") || strings.Contains(name, ":") {
						return lsdapi.DistributionType{
							Image: name,
						}
					}
					return lsdapi.DistributionType{
						Name: name,
					}
				}(),
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

	// Step 3: Create ConfigMap with owner reference to the LSD
	if err := kc.createConfigMapWithOwnerReference(ctx, namespace, configMapName, lsdName, models, lsd, maasClient); err != nil {
		// If ConfigMap creation fails, we should clean up the LSD
		kc.Logger.Error("failed to create ConfigMap with owner reference", "error", err)
		// Note: In a production environment, you might want to delete the LSD here
		// For now, we'll return the error but keep the LSD
		return nil, fmt.Errorf("failed to create ConfigMap: %w", err)
	}

	return lsd, nil
}

// createConfigMapWithOwnerReference creates a ConfigMap and sets up owner reference to LSD
func (kc *TokenKubernetesClient) createConfigMapWithOwnerReference(ctx context.Context, namespace, configMapName, lsdName string, models []models.InstallModel, lsd *lsdapi.LlamaStackDistribution, maasClient maas.MaaSClientInterface) error {
	// Step 1: Create ConfigMap with models configuration
	runYAML, err := kc.generateLlamaStackConfig(ctx, namespace, models, maasClient)
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

// ensureVLLMCompatibleURL ensures the URL has /v1 suffix for vLLM provider compatibility
func ensureVLLMCompatibleURL(url string) string {
	// Remove any trailing slashes
	url = strings.TrimSuffix(url, "/")
	// Check if URL already ends with /v1
	if strings.HasSuffix(url, "/v1") {
		return url
	}
	// Add /v1 suffix
	return url + "/v1"
}

// generateLlamaStackConfig generates the Llama Stack configuration YAML
func (kc *TokenKubernetesClient) generateLlamaStackConfig(ctx context.Context, namespace string, installModels []models.InstallModel, maasClient maas.MaaSClientInterface) (string, error) {
	// Create a new config to build
	config := constants.NewDefaultLlamaStackConfig()

	// Create a map of MaaS models for efficient lookup (only call ListModels once)
	maasModelsMap := make(map[string]*models.MaaSModel)
	if maasClient != nil {
		// Check if we have any MaaS models first
		hasMaaSModels := false
		for _, model := range installModels {
			if model.IsMaaSModel {
				hasMaaSModels = true
				break
			}
		}

		if hasMaaSModels {
			// Get all MaaS models once
			maasModels, err := maasClient.ListModels(ctx)
			if err != nil {
				kc.Logger.Error("failed to list MaaS models", "error", err)
				return "", fmt.Errorf("failed to list MaaS models: %w", err)
			}

			// Create map for efficient lookup
			for i := range maasModels {
				model := &maasModels[i]
				maasModelsMap[model.ID] = model
			}

			kc.Logger.Info("loaded MaaS models into map", "count", len(maasModelsMap))
		}
	}

	// Add the default embedding model
	embeddingModel := constants.NewEmbeddingModel(
		constants.DefaultEmbeddingModel.ModelID,
		constants.DefaultEmbeddingModel.ProviderID,
		constants.DefaultEmbeddingModel.ProviderModelID,
		int(constants.DefaultEmbeddingModel.EmbeddingDimension),
	)
	config.AddModel(embeddingModel)

	for i, model := range installModels {
		if model.IsMaaSModel {
			// Handle MaaS models using the pre-loaded map
			maasModel, exists := maasModelsMap[model.ModelName]
			if !exists {
				kc.Logger.Error("MaaS model not found in map", "model", model.ModelName)
				return "", fmt.Errorf("MaaS model '%s' not found", model.ModelName)
			}

			// Check if model is ready
			if !maasModel.Ready {
				kc.Logger.Error("MaaS model is not ready", "model", model.ModelName, "modelID", maasModel.ID)
				return "", fmt.Errorf("MaaS model '%s' is not ready (status: %t)", model.ModelName, maasModel.Ready)
			}

			// Create provider and model for MaaS model
			providerID := fmt.Sprintf("maas-vllm-inference-%d", i+1)
			endpointURL := ensureVLLMCompatibleURL(maasModel.URL)
			addProviderAndModel(config, providerID, endpointURL, i, maasModel.ID, "llm", nil)
			kc.Logger.Info("Added MaaS model to configuration", "model", maasModel.ID, "endpoint", endpointURL)
		} else {
			// Handle regular models
			modelDetails, err := kc.getModelDetailsFromServingRuntime(ctx, namespace, model.ModelName)
			if err != nil {
				kc.Logger.Error("failed to get model details from serving runtime", "model", model.ModelName, "isMaaSModel", model.IsMaaSModel, "error", err)
				return "", fmt.Errorf("cannot determine endpoint for model '%s': %w", model.ModelName, err)
			}

			// Extract details from the model configuration
			modelID := modelDetails["model_id"].(string)
			providerID := fmt.Sprintf("vllm-inference-%d", i+1)
			modelType := modelDetails["model_type"].(string)
			endpointURL := modelDetails["endpoint_url"].(string)
			metadata := modelDetails["metadata"].(map[string]interface{})

			// Create provider and model for regular model
			addProviderAndModel(config, providerID, endpointURL, i, modelID, modelType, metadata)
			kc.Logger.Info("Added regular LLM model to configuration", "model", modelID, "endpoint", endpointURL)

		}
	}

	// Convert the config to YAML
	configYAML, err := config.ToYAML()
	if err != nil {
		return "", fmt.Errorf("failed to convert config to YAML: %w", err)
	}

	// Add comment header
	configYAML = "# Llama Stack Configuration\n" + configYAML
	return configYAML, nil
}

// getModelDetailsFromServingRuntime queries the serving runtime and inference service
// to get detailed model configuration information
func (kc *TokenKubernetesClient) getModelDetailsFromServingRuntime(ctx context.Context, namespace string, modelID string) (map[string]interface{}, error) {
	// First try to find InferenceService by name
	targetISVC, err := kc.findInferenceServiceByModelName(ctx, namespace, modelID)
	if err != nil {
		kc.Logger.Warn("unable to find InferenceService for model, trying LLMInferenceService", "modelID", modelID, "error", err)

		// Fallback to LLMInferenceService
		targetLLMSVC, llmErr := kc.findLLMInferenceServiceByModelName(ctx, namespace, modelID)
		if llmErr != nil {
			kc.Logger.Error("failed to find both InferenceService and LLMInferenceService for model", "modelID", modelID, "inferenceServiceError", err, "llmInferenceServiceError", llmErr)
			return nil, fmt.Errorf("neither InferenceService nor LLMInferenceService for model '%s' found: InferenceService error: %w, LLMInferenceService error: %w", modelID, err, llmErr)
		}

		// Extract endpoint from LLMInferenceService
		endpointURL, extractErr := kc.extractEndpointFromLLMInferenceService(targetLLMSVC)
		if extractErr != nil {
			kc.Logger.Error("failed to extract endpoint from LLMInferenceService", "modelID", modelID, "error", extractErr)
			return nil, fmt.Errorf("failed to extract endpoint from LLMInferenceService for model '%s': %w", modelID, extractErr)
		}

		// Extract additional metadata from the LLMInferenceService
		metadata := map[string]interface{}{}
		if targetLLMSVC.Annotations != nil {
			if displayName, exists := targetLLMSVC.Annotations[DisplayNameAnnotation]; exists {
				metadata["display_name"] = displayName
			}
			if description, exists := targetLLMSVC.Annotations[InferenceServiceDescriptionAnnotation]; exists {
				metadata["description"] = description
			}
		}

		// All models are LLM models using vllm-inference
		modelType := "llm"

		// Use the actual model name from LLMInferenceService spec instead of service name
		actualModelName := *targetLLMSVC.Spec.Model.Name
		kc.Logger.Info("using LLMInferenceService for model", "serviceName", modelID, "actualModelName", actualModelName, "endpoint", endpointURL)
		return map[string]interface{}{
			"model_id":     actualModelName, // Use the actual model name from spec.model.name
			"model_type":   modelType,
			"metadata":     metadata,
			"endpoint_url": endpointURL,
		}, nil
	}

	// Extract the internal URL from the InferenceService status
	// Use Status.URL which is already the internal HTTP address
	if targetISVC.Status.Address.URL == nil {
		kc.Logger.Error("InferenceService has no internal URL", "name", targetISVC.Name, "namespace", namespace)
		return nil, fmt.Errorf("InferenceService '%s' has no internal URL - service may not be ready", targetISVC.Name)
	}

	// When routes are enabled, the Status.URL is the route URL, not the internal URL so we use the Address.URL
	internalURL := targetISVC.Status.Address.URL.URL()

	if targetISVC.Annotations["security.opendatahub.io/enable-auth"] != "true" {
		// For non-auth services, ensure http scheme
		if internalURL.Scheme == "https" {
			internalURL.Scheme = "http"
		}
	}

	// Find services owned by this InferenceService
	services, err := kc.findServicesForInferenceService(ctx, namespace, targetISVC)
	if err != nil {
		kc.Logger.Warn("failed to find services for InferenceService", "name", targetISVC.Name, "error", err)
	} else if len(services) == 0 {
		kc.Logger.Warn("no services found for InferenceService", "name", targetISVC.Name)
	} else {
		svc := services[0]
		isHeadless := kc.isHeadlessService(ctx, namespace, svc.Name)
		port := kc.getServingPort(ctx, namespace, svc.Name)

		if isHeadless && internalURL.Port() == "" {
			internalURL.Host = fmt.Sprintf("%s:%d", internalURL.Hostname(), port)
			kc.Logger.Info("headless kserve detected: HeadlessService is used; adding target port to internal URL",
				"service", svc.Name, "port", port, "url", internalURL.String())
		}
	}

	internalURLStr := internalURL.String()
	// Add /v1 suffix if not present
	if !strings.HasSuffix(internalURLStr, "/v1") {
		internalURLStr = internalURLStr + "/v1"
	}

	// Extract additional metadata from the InferenceService
	metadata := map[string]interface{}{}
	if targetISVC.Annotations != nil {
		if displayName, exists := targetISVC.Annotations[DisplayNameAnnotation]; exists {
			metadata["display_name"] = displayName
		}
		if description, exists := targetISVC.Annotations[InferenceServiceDescriptionAnnotation]; exists {
			metadata["description"] = description
		}
	}

	// All models are LLM models using vllm-inference
	modelType := "llm"

	kc.Logger.Info("Using InferenceService for model", "modelID", modelID, "endpoint", internalURLStr)
	return map[string]interface{}{
		"model_id":     strings.ReplaceAll(modelID, ":", "-"),
		"model_type":   modelType,
		"metadata":     metadata,
		"endpoint_url": internalURLStr,
	}, nil
}

func (kc *TokenKubernetesClient) isHeadlessService(ctx context.Context, namespace, svcName string) bool {
	var svc corev1.Service
	if err := kc.Client.Get(ctx, types.NamespacedName{Name: svcName, Namespace: namespace}, &svc); err != nil {
		kc.Logger.Warn("unable to check if service is headless", "service", svcName, "error", err)
		return false
	}
	return svc.Spec.ClusterIP == "None"
}

// For headless services, we use TargetPort because ClusterIP/Port may not exist or may be shared;
// TargetPort points directly to the container port in the pods.
func (kc *TokenKubernetesClient) getServingPort(ctx context.Context, namespace, svcName string) int32 {
	const defaultPort int32 = 8080

	var svc corev1.Service
	if err := kc.Client.Get(ctx, types.NamespacedName{Name: svcName, Namespace: namespace}, &svc); err != nil || len(svc.Spec.Ports) == 0 {
		return defaultPort
	}

	if svc.Spec.Ports[0].TargetPort.IntVal != 0 {
		return svc.Spec.Ports[0].TargetPort.IntVal
	}

	return defaultPort
}

func (kc *TokenKubernetesClient) findServicesForInferenceService(ctx context.Context, namespace string, isvc metav1.Object) ([]corev1.Service, error) {
	var svcList corev1.ServiceList

	// Use label selector to only fetch services with the serving.kserve.io/inferenceservice label
	labelSelector := labels.SelectorFromSet(map[string]string{
		"serving.kserve.io/inferenceservice": isvc.GetName(),
	})

	listOptions := &client.ListOptions{
		Namespace:     namespace,
		LabelSelector: labelSelector,
	}

	if err := kc.Client.List(ctx, &svcList, listOptions); err != nil {
		return nil, err
	}

	// Filter by owner reference to ensure we only get services owned by this InferenceService
	var services []corev1.Service
	for _, svc := range svcList.Items {
		for _, owner := range svc.OwnerReferences {
			if owner.UID == isvc.GetUID() {
				services = append(services, svc)
				break
			}
		}
	}

	return services, nil
}

// findInferenceServiceByModelName finds an InferenceService by its display name annotation
func (kc *TokenKubernetesClient) findInferenceServiceByModelName(ctx context.Context, namespace, modelName string) (*kservev1beta1.InferenceService, error) {
	// List all InferenceServices in the namespace
	var isvcList kservev1beta1.InferenceServiceList
	err := kc.Client.List(ctx, &isvcList, client.InNamespace(namespace))
	if err != nil {
		kc.Logger.Error("failed to list InferenceServices", "error", err, "namespace", namespace)
		return nil, fmt.Errorf("failed to list InferenceServices in namespace %s: %w", namespace, err)
	}

	// Find InferenceService with name matching the model name
	for _, isvc := range isvcList.Items {
		if isvc.Name == modelName {
			kc.Logger.Info("Found InferenceService by model name", "modelName", modelName, "isvcName", isvc.Name, "namespace", namespace)
			return &isvc, nil
		}
	}

	return nil, fmt.Errorf("InferenceService with model name '%s' not found in namespace %s", modelName, namespace)
}

// findLLMInferenceServiceByModelName finds an LLMInferenceService by its model name
func (kc *TokenKubernetesClient) findLLMInferenceServiceByModelName(ctx context.Context, namespace, modelName string) (*kservev1alpha1.LLMInferenceService, error) {
	// List all LLMInferenceServices in the namespace
	var llmSvcList kservev1alpha1.LLMInferenceServiceList
	err := kc.Client.List(ctx, &llmSvcList, client.InNamespace(namespace))
	if err != nil {
		kc.Logger.Error("failed to list LLMInferenceServices", "error", err, "namespace", namespace)
		return nil, fmt.Errorf("failed to list LLMInferenceServices in namespace %s: %w", namespace, err)
	}

	// Find LLMInferenceService with name matching the model name
	for _, llmSvc := range llmSvcList.Items {
		if llmSvc.Name == modelName {
			kc.Logger.Info("found LLMInferenceService by model name", "modelName", modelName, "llmSvcName", llmSvc.Name, "namespace", namespace)
			return &llmSvc, nil
		}
	}

	return nil, fmt.Errorf("LLMInferenceService with model name '%s' not found in namespace %s", modelName, namespace)
}

// extractEndpointFromLLMInferenceService extracts the endpoint URL from LLMInferenceService status.addresses
func (kc *TokenKubernetesClient) extractEndpointFromLLMInferenceService(llmSvc *kservev1alpha1.LLMInferenceService) (string, error) {
	// Check if status.addresses exists and has at least one address
	if len(llmSvc.Status.Addresses) == 0 {
		kc.Logger.Error("LLMInferenceService has no addresses in status", "name", llmSvc.Name, "namespace", llmSvc.Namespace)
		return "", fmt.Errorf("LLMInferenceService '%s' has no addresses in status - service may not be ready", llmSvc.Name)
	}

	// Get the first address URL
	firstAddress := llmSvc.Status.Addresses[0]
	if firstAddress.URL == nil {
		kc.Logger.Error("LLMInferenceService first address has no URL", "name", llmSvc.Name, "namespace", llmSvc.Namespace)
		return "", fmt.Errorf("LLMInferenceService '%s' first address has no URL", llmSvc.Name)
	}

	endpointURL := firstAddress.URL.String()

	// Add /v1 suffix if not present for LLMInferenceService compatibility
	if !strings.HasSuffix(endpointURL, "/v1") {
		endpointURL = endpointURL + "/v1"
	}

	kc.Logger.Info("extracted endpoint from LLMInferenceService", "name", llmSvc.Name, "endpoint", endpointURL)

	return endpointURL, nil
}

func (kc *TokenKubernetesClient) DeleteLlamaStackDistribution(ctx context.Context, identity *integrations.RequestIdentity, namespace string, name string) (*lsdapi.LlamaStackDistribution, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// First, fetch the LSD in the namespace with the OpenDataHubDashboardLabelKey annotation
	lsdList, err := kc.GetLlamaStackDistributions(ctx, identity, namespace)
	if err != nil {
		kc.Logger.Error("failed to fetch LlamaStackDistributions", "error", err, "namespace", namespace)
		return nil, fmt.Errorf("failed to fetch LlamaStackDistributions: %w", err)
	}

	// Check if any LSD resources were found
	if len(lsdList.Items) == 0 {
		kc.Logger.Error("no LlamaStackDistribution found with OpenDataHubDashboardLabelKey annotation", "namespace", namespace)
		return nil, fmt.Errorf("no LlamaStackDistribution found in namespace %s with OpenDataHubDashboardLabelKey annotation", namespace)
	}

	// Find the LSD with matching k8s name
	var targetLSD *lsdapi.LlamaStackDistribution
	for i := range lsdList.Items {
		lsd := &lsdList.Items[i]
		if lsd.Name == name {
			targetLSD = lsd
			break
		}
	}

	// If no LSD with matching k8s name found, return error
	if targetLSD == nil {
		kc.Logger.Error("LlamaStackDistribution with matching name not found", "k8sName", name, "namespace", namespace)
		return nil, fmt.Errorf("LlamaStackDistribution with name '%s' not found in namespace %s", name, namespace)
	}

	// Delete the LSD using the actual resource name
	err = kc.Client.Delete(ctx, &lsdapi.LlamaStackDistribution{ObjectMeta: metav1.ObjectMeta{Name: targetLSD.Name, Namespace: namespace}})
	if err != nil {
		kc.Logger.Error("failed to delete LlamaStackDistribution", "error", err, "namespace", namespace, "name", targetLSD.Name)
		return nil, fmt.Errorf("failed to delete LlamaStackDistribution: %w", err)
	}

	kc.Logger.Info("successfully deleted LlamaStackDistribution", "namespace", namespace, "name", targetLSD.Name, "displayName", name)
	return targetLSD, nil
}

// GetModelProviderInfo retrieves provider configuration for a model from LlamaStackConfig
func (kc *TokenKubernetesClient) GetModelProviderInfo(ctx context.Context, identity *integrations.RequestIdentity, namespace string, modelID string) (*genaitypes.ModelProviderInfo, error) {
	// Get LlamaStackDistribution
	config, err := loadLlamaStackConfig(ctx, kc, identity, namespace)
	if config == nil {
		return nil, err
	}
	// Get model provider info from config
	return config.GetModelProviderInfo(modelID)
}

// addProviderAndModel adds a provider and model to the LlamaStack configuration
func addProviderAndModel(config *constants.LlamaStackConfig, providerID, endpointURL string, index int, modelID, modelType string, metadata map[string]interface{}) {
	// Create provider config
	providerConfig := constants.EmptyConfig()
	providerConfig["url"] = endpointURL
	providerConfig["max_tokens"] = "${env.VLLM_MAX_TOKENS:=4096}"
	providerConfig["api_token"] = fmt.Sprintf("${env.VLLM_API_TOKEN_%d:=fake}", index+1)
	providerConfig["tls_verify"] = "${env.VLLM_TLS_VERIFY:=true}"

	// Add provider
	provider := constants.NewProvider(providerID, "remote::vllm", providerConfig)
	config.AddInferenceProvider(provider)

	// Add model
	var model constants.Model
	if metadata == nil {
		// For MaaS models or when no metadata is provided
		model = constants.NewLLMModel(modelID, providerID, modelID)
	} else {
		// For regular models with metadata
		model = constants.NewModel(modelID, providerID, modelType, metadata)
	}
	config.AddModel(model)
}

func loadLlamaStackConfig(ctx context.Context, kc *TokenKubernetesClient, identity *integrations.RequestIdentity, namespace string) (*constants.LlamaStackConfig, error) {
	lsdList, err := kc.GetLlamaStackDistributions(ctx, identity, namespace)
	if err != nil {
		return nil, fmt.Errorf("failed to get LlamaStackDistributions: %w", err)
	}

	if len(lsdList.Items) == 0 {
		return nil, fmt.Errorf("no LlamaStackDistribution found in namespace %s", namespace)
	}

	if len(lsdList.Items) > 1 {
		kc.Logger.Warn("Multiple LlamaStackDistributions found, using first one",
			"namespace", namespace, "count", len(lsdList.Items))
	}

	lsd := lsdList.Items[0]

	// Get configmap name
	configMapName := constants.LlamaStackConfigMapName
	if lsd.Spec.Server.UserConfig != nil && lsd.Spec.Server.UserConfig.ConfigMapName != "" {
		configMapName = lsd.Spec.Server.UserConfig.ConfigMapName
	}

	// Retrieve configmap
	configMap, err := kc.GetConfigMap(ctx, identity, namespace, configMapName)
	if err != nil {
		return nil, fmt.Errorf("failed to get configmap: %w", err)
	}

	runYAML, ok := configMap.Data[constants.LlamaStackRunYAMLKey]
	if !ok {
		return nil, fmt.Errorf("run.yaml not found in configmap")
	}

	// Parse YAML into config
	var config constants.LlamaStackConfig
	if err := config.FromYAML(runYAML); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}
	return &config, nil
}

// GetClusterDomain retrieves the cluster domain from the ingresses.config.openshift.io/cluster resource
func (kc *TokenKubernetesClient) GetClusterDomain(ctx context.Context) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Create a REST client specifically configured for the config.openshift.io API
	config := rest.CopyConfig(kc.Config)
	config.APIPath = "/apis"
	config.GroupVersion = &schema.GroupVersion{Group: "config.openshift.io", Version: "v1"}
	config.NegotiatedSerializer = scheme.Codecs.WithoutConversion()

	restClient, err := rest.RESTClientFor(config)
	if err != nil {
		kc.Logger.Error("failed to create REST client for cluster domain query", "error", err)
		return "", fmt.Errorf("failed to create REST client: %w", err)
	}

	// Query the ingresses.config.openshift.io/cluster resource
	result := restClient.Get().
		Resource("ingresses").
		Name("cluster").
		Do(ctx)

	rawBytes, err := result.Raw()
	if err != nil {
		kc.Logger.Debug("failed to get cluster ingress config", "error", err)
		return "", fmt.Errorf("failed to get cluster domain: %w", err)
	}

	// Parse the JSON response
	var obj map[string]interface{}
	if err := json.Unmarshal(rawBytes, &obj); err != nil {
		return "", fmt.Errorf("failed to parse ingress config response: %w", err)
	}

	// Extract the domain from spec.domain
	spec, ok := obj["spec"].(map[string]interface{})
	if !ok {
		return "", fmt.Errorf("invalid ingress config structure: missing spec")
	}

	domain, ok := spec["domain"].(string)
	if !ok || domain == "" {
		return "", fmt.Errorf("invalid ingress config structure: missing or empty domain")
	}

	kc.Logger.Debug("discovered cluster domain", "domain", domain)
	return domain, nil
}
