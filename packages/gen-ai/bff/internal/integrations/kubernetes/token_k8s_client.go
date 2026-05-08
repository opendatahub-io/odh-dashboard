package kubernetes

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/url"
	"strconv"
	"strings"
	"time"

	"golang.org/x/sync/errgroup"

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

	"gopkg.in/yaml.v2"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	apimeta "k8s.io/apimachinery/pkg/api/meta"
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

	// Import TrustyAI GuardrailsOrchestrator types
	gorchv1alpha1 "github.com/trustyai-explainability/trustyai-service-operator/api/gorch/v1alpha1"
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

	// Labels for identifying KServe services
	InferenceServiceName                 = "serving.kserve.io/inferenceservice"
	LLMInferenceServiceName              = "app.kubernetes.io/name"
	LLMInferenceServiceComponent         = "app.kubernetes.io/component"
	LLMInferenceServiceWorkloadComponent = "llminferenceservice-workload"

	// Annotation for authentication
	authAnnotationKey = "security.opendatahub.io/enable-auth"
)

type modelDetailsResult struct {
	modelID     string
	modelType   string
	endpointURL string
	metadata    map[string]interface{}
}

type externalModelDetailsResult struct {
	modelID      string
	modelType    string
	endpointURL  string
	metadata     map[string]interface{}
	providerID   string
	providerType string
}

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

// GetClusterDomainUsingServiceAccount retrieves cluster domain using the pod's service account
func GetClusterDomainUsingServiceAccount(ctx context.Context, logger *slog.Logger) (string, error) {
	// Use in-cluster config (pod's service account)
	cfg, err := rest.InClusterConfig()
	if err != nil {
		return "", err
	}

	// Query ingresses.config.openshift.io/cluster using service account
	config := rest.CopyConfig(cfg)
	config.APIPath = "/apis"
	config.GroupVersion = &schema.GroupVersion{Group: "config.openshift.io", Version: "v1"}
	config.NegotiatedSerializer = scheme.Codecs.WithoutConversion()

	restClient, err := rest.RESTClientFor(config)
	if err != nil {
		return "", err
	}

	result := restClient.Get().Resource("ingresses").Name("cluster").Do(ctx)
	rawBytes, err := result.Raw()
	if err != nil {
		return "", err
	}

	var obj map[string]interface{}
	if err := json.Unmarshal(rawBytes, &obj); err != nil {
		return "", err
	}

	spec, ok := obj["spec"].(map[string]interface{})
	if !ok {
		return "", fmt.Errorf("invalid ingress config: missing spec")
	}

	domain, ok := spec["domain"].(string)
	if !ok || domain == "" {
		return "", fmt.Errorf("invalid ingress config: missing domain")
	}

	return domain, nil
}

func newTokenKubernetesClient(token string, logger *slog.Logger, envConfig config.EnvConfig) (*TokenKubernetesClient, error) {
	baseConfig, err := helper.GetKubeconfig()
	if err != nil {
		logger.Error("failed to get kube config", "error", err)
		return nil, fmt.Errorf("failed to get kube config: %w", err)
	}

	// Start with an anonymous config to avoid preloaded auth
	cfg := rest.AnonymousClientConfig(baseConfig)
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
	userConfig := rest.AnonymousClientConfig(kc.Config)
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
	config := rest.AnonymousClientConfig(kc.Config)
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
	config := rest.AnonymousClientConfig(kc.Config)
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
		return false, wrapK8sSubjectAccessReviewError(err, namespace)
	}

	return resp.Status.Allowed, nil
}

// CanListGuardrailsOrchestrator performs a SubjectAccessReview to check if the user has permission to list GuardrailsOrchestrator resources
func (kc *TokenKubernetesClient) CanListGuardrailsOrchestrator(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Check for nil identity
	if identity == nil {
		kc.Logger.Error("identity is nil")
		return false, fmt.Errorf("identity cannot be nil")
	}

	// Create a new config with the token from the request identity
	config := rest.AnonymousClientConfig(kc.Config)
	config.BearerToken = identity.Token
	config.BearerTokenFile = ""

	// Create a kubernetes clientset to use the authorization API
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		kc.Logger.Error("failed to create kubernetes clientset for SAR", "error", err)
		return false, fmt.Errorf("failed to create kubernetes clientset: %w", err)
	}

	// Create SelfSubjectAccessReview to check if user can list GuardrailsOrchestrator resources
	sar := &authv1.SelfSubjectAccessReview{
		Spec: authv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authv1.ResourceAttributes{
				Verb:      "list",
				Group:     "trustyai.opendatahub.io",
				Resource:  "guardrailsorchestrators",
				Namespace: namespace,
			},
		},
	}

	resp, err := clientset.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		kc.Logger.Error("failed to perform GuardrailsOrchestrator list SAR", "error", err)
		return false, wrapK8sSubjectAccessReviewError(err, namespace)
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

// GetNemoGuardrailsServiceURL lists NemoGuardrails CRs (trustyai.opendatahub.io/v1alpha1)
// in the namespace and derives the in-cluster service URL from the first CR found.
// The TrustyAI operator creates a Service with the same name as the CR on port 443.
// Returns ("", nil) if no NemoGuardrails CR exists in the namespace.
func (kc *TokenKubernetesClient) GetNemoGuardrailsServiceURL(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	list := &unstructured.UnstructuredList{}
	list.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "trustyai.opendatahub.io",
		Version: "v1alpha1",
		Kind:    "NemoGuardrailsList",
	})

	if err := kc.Client.List(ctx, list, client.InNamespace(namespace)); err != nil {
		kc.Logger.Error("failed to list NemoGuardrails CRs", "error", err, "namespace", namespace)
		return "", fmt.Errorf("failed to list NemoGuardrails CRs: %w", err)
	}

	if len(list.Items) == 0 {
		return "", nil
	}

	crName := list.Items[0].GetName()
	serviceURL := fmt.Sprintf("https://%s.%s.svc.cluster.local:443", crName, namespace)
	kc.Logger.Debug("Discovered NemoGuardrails service URL from CR",
		"namespace", namespace,
		"crName", crName,
		"serviceURL", serviceURL)
	return serviceURL, nil
}

func (kc *TokenKubernetesClient) BearerToken() (string, error) {
	return kc.Token.Raw(), nil
}

// GetUser returns the username from a SelfSubjectReview request
func (kc *TokenKubernetesClient) GetUser(ctx context.Context, identity *integrations.RequestIdentity) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Create a new config with the token from the request identity
	config := rest.AnonymousClientConfig(kc.Config)
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

// ValidatedVectorStore pairs a VectorIOProvider with its associated RegisteredVectorStore
// after they have been correlated by provider_id from the gen-ai-aa-vector-stores ConfigMap.
type ValidatedVectorStore struct {
	Provider        models.VectorIOProvider
	RegisteredStore models.RegisteredVectorStore
	// CredEnvVarName is the env var name (e.g. "VS_CREDENTIAL_1") that will hold the
	// credential value at runtime. Empty when the provider has no credentials.
	CredEnvVarName string
	// CredSecretRef is the K8s secret reference from custom_gen_ai.credentials.secretRefs.
	// Nil when the provider has no credentials.
	CredSecretRef *models.SecretKeyRef
}

// getVectorStoresConfig retrieves and parses the gen-ai-aa-vector-stores ConfigMap.
// The GetConfigMap error is returned unwrapped so callers can inspect it (e.g. apierrors.IsNotFound).
func (kc *TokenKubernetesClient) getVectorStoresConfig(
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
) (*models.ExternalVectorStoresDocument, error) {
	configMap, err := kc.GetConfigMap(ctx, identity, namespace, constants.VectorStoresConfigMapName)
	if err != nil {
		return nil, err
	}

	storesYAML, ok := configMap.Data[constants.VectorStoresYAMLKey]
	if !ok || storesYAML == "" {
		return nil, fmt.Errorf("%s key not found in ConfigMap %s", constants.VectorStoresYAMLKey, constants.VectorStoresConfigMapName)
	}

	var doc models.ExternalVectorStoresDocument
	if err := yaml.Unmarshal([]byte(storesYAML), &doc); err != nil {
		return nil, fmt.Errorf("failed to parse %s: %w", constants.VectorStoresYAMLKey, err)
	}

	return &doc, nil
}

// GetVectorStoresConfig retrieves and parses the gen-ai-aa-vector-stores ConfigMap.
// This is the public interface method; identity is not required because the client
// uses its own configured auth context.
func (kc *TokenKubernetesClient) GetVectorStoresConfig(ctx context.Context, namespace string) (*models.ExternalVectorStoresDocument, error) {
	return kc.getVectorStoresConfig(ctx, nil, namespace)
}

// validateVectorStores looks up each requested vector store in the parsed config document,
// correlates it with its provider entry by provider_id, assigns credential env vars for
// providers that need them, and returns the ordered slice.
func validateVectorStores(vectorStores []models.InstallVectorStore, doc *models.ExternalVectorStoresDocument) ([]ValidatedVectorStore, error) {
	providersByID := make(map[string]models.VectorIOProvider, len(doc.Providers.VectorIO))
	for _, p := range doc.Providers.VectorIO {
		providersByID[p.ProviderID] = p
	}
	registeredByID := make(map[string]models.RegisteredVectorStore, len(doc.RegisteredResources.VectorStores))
	for _, s := range doc.RegisteredResources.VectorStores {
		registeredByID[s.VectorStoreID] = s
	}

	// credByProvider tracks the VS_CREDENTIAL_N env var name and secret ref assigned to each
	// provider on first encounter. Providers without credentials map to the zero value (empty name, nil ref).
	type providerCred struct {
		envVarName string
		secretRef  *models.SecretKeyRef
	}
	credByProvider := make(map[string]providerCred)
	credCounter := 0

	result := make([]ValidatedVectorStore, 0, len(vectorStores))
	for _, vs := range vectorStores {
		registered, found := registeredByID[vs.VectorStoreID]
		if !found {
			return nil, fmt.Errorf("vector store %q not found in ConfigMap %s", vs.VectorStoreID, constants.VectorStoresConfigMapName)
		}
		if registered.EmbeddingModel == "" {
			return nil, fmt.Errorf("vector store %q has empty embedding_model", vs.VectorStoreID)
		}

		provider, found := providersByID[registered.ProviderID]
		if !found {
			return nil, fmt.Errorf("vector store %q references provider_id %q which was not found in providers.vector_io", vs.VectorStoreID, registered.ProviderID)
		}

		cred, seen := credByProvider[provider.ProviderID]
		if !seen {
			secretRef := extractCredentialSecretRef(provider.Config.CustomGenAI)
			if secretRef != nil {
				credCounter++
				cred = providerCred{
					envVarName: fmt.Sprintf("VS_CREDENTIAL_%s_%d", sanitizeEnvVarSegment(provider.ProviderID), credCounter),
					secretRef:  secretRef,
				}
			}
			credByProvider[provider.ProviderID] = cred
		}

		result = append(result, ValidatedVectorStore{
			Provider:        provider,
			RegisteredStore: registered,
			CredEnvVarName:  cred.envVarName,
			CredSecretRef:   cred.secretRef,
		})
	}

	return result, nil
}

// LoadAndValidateVectorStores reads the gen-ai-aa-vector-stores ConfigMap, looks up each
// requested vector store by vector_store_id, correlates it with its provider entry by
// provider_id, and returns the ordered slice. Exported so the mock can reuse this logic.
func (kc *TokenKubernetesClient) LoadAndValidateVectorStores(
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	vectorStores []models.InstallVectorStore,
) ([]ValidatedVectorStore, error) {
	doc, err := kc.getVectorStoresConfig(ctx, identity, namespace)
	if err != nil {
		if apierrors.IsNotFound(err) {
			return nil, fmt.Errorf("vector stores were supplied but the %s ConfigMap was not found in namespace %s", constants.VectorStoresConfigMapName, namespace)
		}
		return nil, fmt.Errorf("failed to get vector stores ConfigMap: %w", err)
	}

	return validateVectorStores(vectorStores, doc)
}

// sanitizeEnvVarSegment converts s into a safe env var name segment by uppercasing it,
// replacing any character that is not A-Z, 0-9, or _ with an underscore, and truncating
// to 50 characters to keep env var names manageable.
const maxEnvVarSegmentLen = 50

func sanitizeEnvVarSegment(s string) string {
	result := strings.Map(func(r rune) rune {
		if r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '_' {
			return r
		}
		if r >= 'a' && r <= 'z' {
			return r - 32 // to uppercase
		}
		return '_'
	}, s)
	if len(result) > maxEnvVarSegmentLen {
		result = result[:maxEnvVarSegmentLen]
	}
	return result
}

// extractCredentialSecretRef returns the first secretRef from custom_gen_ai.credentials.secretRefs
// that has a non-empty name and key. The key is used directly as the LlamaStack provider config
// field name (e.g. "password" for pgvector, "token" for milvus, "api_key" for qdrant), so the
// platform engineer controls the mapping without any BFF-side provider type lookup.
// Returns nil if no valid ref is found.
func extractCredentialSecretRef(cga *models.CustomGenAIConfig) *models.SecretKeyRef {
	if cga == nil || cga.Credentials == nil {
		return nil
	}
	for _, ref := range cga.Credentials.SecretRefs {
		if ref.Name != "" && ref.Key != "" {
			return &models.SecretKeyRef{Name: ref.Name, Key: ref.Key}
		}
	}
	return nil
}

// GetGuardrailsOrchestratorStatus lists GuardrailsOrchestrators in the namespace and returns the first one found.
func (kc *TokenKubernetesClient) GetGuardrailsOrchestratorStatus(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (*models.GuardrailsStatus, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	guardrailsList := &gorchv1alpha1.GuardrailsOrchestratorList{}
	listOptions := &client.ListOptions{
		Namespace: namespace,
	}

	err := kc.Client.List(ctx, guardrailsList, listOptions)
	if err != nil {
		kc.Logger.Error("failed to list GuardrailsOrchestrators", "error", err, "namespace", namespace)
		return nil, NewK8sErrorWithNamespace(ErrCodeInternalError,
			fmt.Sprintf("failed to list guardrailsOrchestrators: %v", err), namespace, 500)
	}

	if len(guardrailsList.Items) == 0 {
		return nil, NewK8sErrorWithNamespace(ErrCodeNotFound,
			"guardrailsOrchestrator not found", namespace, 404)
	}

	guardrailsCR := guardrailsList.Items[0]
	phase := guardrailsCR.Status.Phase
	if phase == "" {
		phase = constants.GuardrailsPhaseProgressing
	}

	return &models.GuardrailsStatus{
		Name:       guardrailsCR.Name,
		Phase:      phase,
		Conditions: guardrailsCR.Status.Conditions,
	}, nil
}

func (kc *TokenKubernetesClient) GetAAModels(ctx context.Context, identity *integrations.RequestIdentity, namespace string) ([]models.AAModel, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	labelSelector := labels.SelectorFromSet(labels.Set{
		GenAIAssetLabelKey: "true",
	})

	g, gCtx := errgroup.WithContext(ctx)
	var aaModelsFromInfSvc, aaModelsFromLLMInfSvc, aaModelsFromExternal []models.AAModel

	g.Go(func() error {
		var err error
		aaModelsFromInfSvc, err = kc.getAAModelsFromInferenceService(gCtx, namespace, labelSelector)
		return err
	})

	g.Go(func() error {
		var err error
		aaModelsFromLLMInfSvc, err = kc.getAAModelsFromLLMInferenceService(gCtx, namespace, labelSelector)
		return err
	})

	g.Go(func() error {
		var err error
		aaModelsFromExternal, err = kc.GetAAModelsFromExternalModels(gCtx, identity, namespace)
		if err != nil {
			kc.Logger.Warn("failed to get external models, continuing with namespace models only",
				"error", err,
				"namespace", namespace)
			aaModelsFromExternal = []models.AAModel{}
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	var allAAModels []models.AAModel
	allAAModels = append(allAAModels, aaModelsFromInfSvc...)
	allAAModels = append(allAAModels, aaModelsFromLLMInfSvc...)
	allAAModels = append(allAAModels, aaModelsFromExternal...)

	kc.Logger.Info("successfully fetched AAModels",
		"count", len(allAAModels),
		"namespace", namespace,
		"inferenceServices", len(aaModelsFromInfSvc),
		"llmInferenceServices", len(aaModelsFromLLMInfSvc),
		"externalModels", len(aaModelsFromExternal))
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
		// If the CRD is not installed, gracefully return empty list
		if apierrors.IsNotFound(err) || apimeta.IsNoMatchError(err) {
			kc.Logger.Debug("LLMInferenceService CRD not installed or not found", "namespace", namespace)
			return []models.AAModel{}, nil
		}
		kc.Logger.Error("failed to list LLMInferenceServices", "error", err, "namespace", namespace)
		return nil, fmt.Errorf("failed to list LLMInferenceServices: %w", err)
	}

	var aaModels []models.AAModel
	for _, llmSvc := range llmInferenceServiceList.Items {
		aaModel := models.AAModel{
			ModelName:       llmSvc.Name,
			ModelID:         *llmSvc.Spec.Model.Name,
			Description:     kc.extractDescriptionFromLLMInferenceService(&llmSvc),
			ServingRuntime:  "Distributed inference with llm-d",
			APIProtocol:     "REST",
			Usecase:         kc.extractUseCaseFromLLMInferenceService(&llmSvc),
			Endpoints:       kc.extractEndpointsFromLLMInferenceService(&llmSvc),
			Status:          kc.extractStatusFromLLMInferenceService(&llmSvc),
			DisplayName:     kc.extractDisplayNameFromLLMInferenceService(&llmSvc),
			ModelSourceType: models.ModelSourceTypeNamespace,
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
		// If the CRD is not installed, gracefully return empty list
		if apierrors.IsNotFound(err) || apimeta.IsNoMatchError(err) {
			kc.Logger.Debug("InferenceService CRD not installed or not found", "namespace", namespace)
			return []models.AAModel{}, nil
		}
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
			ModelName:       isvc.Name,
			ModelID:         isvc.Name,
			ServingRuntime:  kc.extractServingRuntimeFromAnnotations(servingRuntime),
			APIProtocol:     kc.extractAPIProtocolFromAnnotations(servingRuntime),
			Version:         kc.extractVersionFromAnnotations(servingRuntime),
			Description:     kc.extractDescriptionFromInferenceService(&isvc),
			Usecase:         kc.extractUseCaseFromInferenceService(&isvc),
			Endpoints:       kc.extractEndpoints(&isvc),
			Status:          kc.extractStatusFromInferenceService(&isvc),
			DisplayName:     kc.extractDisplayNameFromInferenceService(&isvc),
			ModelSourceType: models.ModelSourceTypeNamespace,
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

// ConstructLLMInferenceServiceURL constructs the internal URL for an LLMInferenceService
// This function is exported for testing purposes
func ConstructLLMInferenceServiceURL(scheme, serviceName, namespace string, port int32) string {
	return fmt.Sprintf("%s://%s.%s.svc.cluster.local:%d/v1", scheme, serviceName, namespace, port)
}

// EnsureV1Suffix ensures that the URL ends with /v1 suffix
// This function is exported for testing purposes
func EnsureV1Suffix(url string) string {
	if !strings.HasSuffix(url, "/v1") {
		return url + "/v1"
	}
	return url
}

// DetermineSchemeFromAuth determines the URL scheme (http/https) based on auth annotation
// This function is exported for testing purposes
func DetermineSchemeFromAuth(authAnnotation string) string {
	if authAnnotation == "true" {
		return "https"
	}
	return "http"
}

// ShouldAddPortToURL determines if a port should be added to the URL
// for InferenceService endpoints only.
// This function is exported for testing purposes
func ShouldAddPortToURL(isHeadless bool, urlHasPort bool) bool {
	return isHeadless && !urlHasPort
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

// Helper method to extract endpoints from LLMInferenceService.
// Uses Address (singular) and URL as primary sources, falls back to Addresses (plural).
func (kc *TokenKubernetesClient) extractEndpointsFromLLMInferenceService(llmSvc *kservev1alpha1.LLMInferenceService) []string {
	if llmSvc == nil {
		return []string{}
	}

	var internalURL, externalURL string

	// Primary: Address (singular) for internal, URL for external
	if llmSvc.Status.Address != nil && llmSvc.Status.Address.URL != nil {
		internalURL = llmSvc.Status.Address.URL.String()
	}
	if llmSvc.Status.URL != nil {
		u := llmSvc.Status.URL.String()
		if !strings.Contains(u, ".svc.cluster.local") {
			externalURL = u
		}
	}

	// Fallback: Addresses (plural) for any missing endpoints
	if internalURL == "" || externalURL == "" {
		for _, addr := range llmSvc.Status.Addresses {
			if addr.URL == nil {
				continue
			}
			u := addr.URL.String()
			if strings.Contains(u, ".svc.cluster.local") {
				if internalURL == "" {
					internalURL = u
				}
			} else if externalURL == "" {
				externalURL = u
			}
		}
	}

	endpoints := []string{}
	if internalURL != "" {
		endpoints = append(endpoints, fmt.Sprintf("internal: %s", internalURL))
	}
	if externalURL != "" {
		endpoints = append(endpoints, fmt.Sprintf("external: %s", externalURL))
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

// GetAAModelsFromExternalModels converts external models from ConfigMap to AAModel structs
func (kc *TokenKubernetesClient) GetAAModelsFromExternalModels(ctx context.Context, identity *integrations.RequestIdentity, namespace string) ([]models.AAModel, error) {
	// Attempt to get the external models ConfigMap
	configMap, err := kc.GetConfigMap(ctx, identity, namespace, constants.ExternalModelsConfigMapName)
	if err != nil {
		// If ConfigMap doesn't exist, that's fine - just return empty list
		if apierrors.IsNotFound(err) {
			kc.Logger.Debug("no external models ConfigMap found", "namespace", namespace)
			return []models.AAModel{}, nil
		}
		// For other errors, log and return them
		kc.Logger.Error("failed to get external models ConfigMap", "error", err, "namespace", namespace)
		return nil, fmt.Errorf("failed to get external models ConfigMap: %w", err)
	}

	// Parse the config.yaml data
	if configMap.Data == nil {
		kc.Logger.Debug("external models ConfigMap has no data", "namespace", namespace)
		return []models.AAModel{}, nil
	}

	configYAML, exists := configMap.Data["config.yaml"]
	if !exists {
		kc.Logger.Debug("external models ConfigMap missing config.yaml key", "namespace", namespace)
		return []models.AAModel{}, nil
	}

	var config models.ExternalModelsConfig
	if err := yaml.Unmarshal([]byte(configYAML), &config); err != nil {
		kc.Logger.Error("failed to unmarshal external models config", "error", err, "namespace", namespace)
		return nil, fmt.Errorf("failed to unmarshal external models config: %w", err)
	}

	if err := kc.validateExternalModelsConfig(&config); err != nil {
		kc.Logger.Error("external models config failed validation", "error", err, "namespace", namespace)
		return nil, fmt.Errorf("invalid external models ConfigMap: %w", err)
	}

	// Build a map of provider ID to provider for quick lookup
	providerMap := make(map[string]models.InferenceProvider)
	for _, provider := range config.Providers.Inference {
		providerMap[provider.ProviderID] = provider
	}

	// Convert registered models to AAModel structs
	var aaModels []models.AAModel
	for _, model := range config.RegisteredResources.Models {
		// Find the corresponding provider
		provider, exists := providerMap[model.ProviderID]
		if !exists {
			kc.Logger.Warn("registered model references non-existent provider",
				"modelID", model.ModelID,
				"providerID", model.ProviderID)
			continue
		}

		// Extract use cases from metadata if available
		useCases := ""
		if model.Metadata.CustomGenAI != nil {
			useCases = model.Metadata.CustomGenAI.UseCases
		}

		aaModel := models.AAModel{
			ModelName:          model.ModelID,
			ModelID:            model.ModelID,
			DisplayName:        model.Metadata.DisplayName,
			ServingRuntime:     string(provider.ProviderType),
			APIProtocol:        "REST",
			Version:            "",
			Usecase:            useCases,
			Description:        "",
			Endpoints:          []string{provider.Config.BaseURL},
			Status:             models.ModelStatusUnknown,
			SAToken:            models.SAToken{},
			ModelSourceType:    models.ModelSourceTypeCustomEndpoint,
			ModelType:          model.ModelType,
			EmbeddingDimension: model.Metadata.EmbeddingDimension,
		}
		aaModels = append(aaModels, aaModel)
	}

	kc.Logger.Info("fetched external models from ConfigMap",
		"count", len(aaModels),
		"namespace", namespace)
	return aaModels, nil
}

// findGuardrailsServiceAccountTokenSecret finds the token secret for the guardrails service account
// This follows the same pattern as VLLM token discovery - finding SA token secrets by type and annotation
func (kc *TokenKubernetesClient) InstallLlamaStackDistribution(ctx context.Context, identity *integrations.RequestIdentity, namespace string, installModels []models.InstallModel, vectorStores []models.InstallVectorStore, maasClient maas.MaaSClientInterface) (*lsdapi.LlamaStackDistribution, error) {
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

	for _, model := range installModels {
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
				kc.Logger.Debug("found existing "+foundType+" service account token secret", "model", model.ModelName, "secretName", secretName, "hasToken", true)
			} else {
				kc.Logger.Debug("found "+foundType+" but no service account token secret", "model", model.ModelName, "hasToken", false)
			}
		} else {
			kc.Logger.Debug("could not find InferenceService or LLMInferenceService for model, will use default", "model", model.ModelName)
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
			Name:  "VLLM_MAX_TOKENS",
			Value: "4096",
		},
		{
			Name:  "SENTENCE_TRANSFORMERS_HOME",
			Value: "/opt/app-root/src/.cache/huggingface/hub",
		},
		{
			Name:  "HF_HUB_OFFLINE",
			Value: "1",
		},
		{
			Name:  "TRANSFORMERS_OFFLINE",
			Value: "1",
		},
		{
			Name:  "HF_DATASETS_OFFLINE",
			Value: "1",
		},
	}

	// Add token environment variables from existing secrets
	for i, model := range installModels {
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
				kc.Logger.Debug("Referencing existing service account token secret", "model", model.ModelName, "envVar", envVarName, "secretName", secretInfo.secretName)
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

	// Step 4: Validate vector stores and inject credential env vars for providers that need them.
	var validatedVectorStores []ValidatedVectorStore
	if len(vectorStores) > 0 {
		validatedVectorStores, err = kc.LoadAndValidateVectorStores(ctx, identity, namespace, vectorStores)
		if err != nil {
			return nil, err
		}

		// Inject one env var per unique provider credential (deduped by env var name).
		injectedEnvVars := make(map[string]bool)
		for _, vs := range validatedVectorStores {
			if vs.CredEnvVarName == "" || injectedEnvVars[vs.CredEnvVarName] {
				continue
			}

			// Verify the credential secret exists and contains the expected key before
			// referencing it in the LSD pod spec. This gives a clear error at install time
			// rather than a cryptic pod failure after the LSD is created.
			var secret corev1.Secret
			if err := kc.Client.Get(ctx, types.NamespacedName{
				Name:      vs.CredSecretRef.Name,
				Namespace: namespace,
			}, &secret); err != nil {
				return nil, fmt.Errorf("vector store provider %q credential secret %q not found in namespace %s: %w",
					vs.Provider.ProviderID, vs.CredSecretRef.Name, namespace, err)
			}
			if _, ok := secret.Data[vs.CredSecretRef.Key]; !ok {
				return nil, fmt.Errorf("vector store provider %q credential secret %q is missing key %q",
					vs.Provider.ProviderID, vs.CredSecretRef.Name, vs.CredSecretRef.Key)
			}

			envVars = append(envVars, corev1.EnvVar{
				Name: vs.CredEnvVarName,
				ValueFrom: &corev1.EnvVarSource{
					SecretKeyRef: &corev1.SecretKeySelector{
						LocalObjectReference: corev1.LocalObjectReference{Name: vs.CredSecretRef.Name},
						Key:                  vs.CredSecretRef.Key,
					},
				},
			})
			injectedEnvVars[vs.CredEnvVarName] = true
			kc.Logger.Debug("Injected vector store credential env var",
				"envVar", vs.CredEnvVarName, "secret", vs.CredSecretRef.Name, "key", vs.CredSecretRef.Key)
		}
	}

	// Step 5: Generate ConfigMap content first (before creating LSD)
	configMapName := "llama-stack-config"
	userAuthToken := ""
	for _, model := range installModels {
		if model.ModelSourceType == models.ModelSourceTypeMaaS {
			if identity.Token == "" {
				return nil, fmt.Errorf("user auth token is required to install MaaS models")
			}
			userAuthToken = identity.Token
			break
		}
	}
	runYAML, err := kc.generateLlamaStackConfig(ctx, namespace, installModels, validatedVectorStores, maasClient, userAuthToken)
	if err != nil {
		kc.Logger.Error("failed to generate Llama Stack configuration", "error", err, "namespace", namespace)
		return nil, fmt.Errorf("failed to generate Llama Stack configuration: %w", err)
	}

	// Step 6: Create ConfigMap BEFORE creating LSD (without owner reference yet)
	// This prevents the LSD from failing with "ConfigMap not found" during initial reconciliation
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
			constants.LlamaStackConfigYAMLKey: runYAML,
		},
	}

	if err := kc.Client.Create(ctx, configMap); err != nil {
		kc.Logger.Error("failed to create ConfigMap", "error", err, "namespace", namespace, "configMapName", configMapName)
		return nil, fmt.Errorf("failed to create ConfigMap: %w", err)
	}

	kc.Logger.Info("ConfigMap created successfully (before LSD creation)", "namespace", namespace, "configMapName", configMapName)

	// Step 7: Create LlamaStackDistribution
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
			Network: &lsdapi.NetworkSpec{
				AllowedFrom: &lsdapi.AllowedFromSpec{
					Namespaces: []string{namespace},
				},
			},
			Server: lsdapi.ServerSpec{
				ContainerSpec: lsdapi.ContainerSpec{
					Command: []string{"/bin/sh", "-c", "llama stack run /etc/llama-stack/config.yaml"},
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

		// Clean up the ConfigMap we just created since LSD creation failed
		if deleteErr := kc.Client.Delete(ctx, configMap); deleteErr != nil {
			kc.Logger.Error("failed to clean up ConfigMap after LSD creation failure", "error", deleteErr, "namespace", namespace, "configMapName", configMapName)
		} else {
			kc.Logger.Info("ConfigMap cleaned up after LSD creation failure", "namespace", namespace, "configMapName", configMapName)
		}

		return nil, fmt.Errorf("failed to create LlamaStackDistribution: %w", err)
	}

	kc.Logger.Info("LlamaStackDistribution created successfully", "namespace", namespace, "lsdName", lsdName, "models", installModels)

	// Step 8: Update ConfigMap to add owner reference to the LSD
	// This ensures the ConfigMap is garbage collected when the LSD is deleted
	configMap.OwnerReferences = []metav1.OwnerReference{
		{
			APIVersion:         "llamastack.io/v1alpha1",
			Kind:               "LlamaStackDistribution",
			Name:               lsdName,
			UID:                lsd.UID,
			Controller:         &[]bool{true}[0],
			BlockOwnerDeletion: &[]bool{false}[0],
		},
	}

	if err := kc.Client.Update(ctx, configMap); err != nil {
		kc.Logger.Error("failed to update ConfigMap with owner reference", "error", err, "namespace", namespace, "configMapName", configMapName)
		// Don't fail the entire operation, just log the warning
		kc.Logger.Warn("ConfigMap will not be automatically garbage collected when LSD is deleted")
		// Continue without failing - the LSD is created successfully
	} else {
		kc.Logger.Info("ConfigMap updated with owner reference", "namespace", namespace, "configMapName", configMapName, "owner", lsdName)
	}

	return lsd, nil
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

// buildEmbeddingModelLookup returns a map from user-supplied embedding_model values
// as found in entries under registered_resources > vector_stores in the gen-ai-aa-vector-stores ConfigMap,
// to the full LlamaStack model identifier (provider_id/effective_provider_model_id),
// mirroring the logic in llama-stack models.py: identifier = f"{provider_id}/{provider_model_id or model_id}"
// Both model_id and provider_model_id are added as keys so the lookup succeeds regardless
// of which value the admin used in the ConfigMap.
// Example of lookup entries this would produce:
//
//	embedding_model: ibm-granite/granite-embedding-125m-english -> sentence-transformers/ibm-granite/granite-embedding-125m-english
//	embedding_model: RedHatAI/granite-embedding-english-r2      -> granite-embed-provider/RedHatAI/granite-embedding-english-r2
func buildEmbeddingModelLookup(ms []Model) map[string]string {
	lookup := make(map[string]string, len(ms))
	for _, m := range ms {
		if m.ModelType != string(models.ModelTypeEmbedding) {
			continue
		}
		effectiveProviderModelID := m.ProviderModelID
		if effectiveProviderModelID == "" {
			effectiveProviderModelID = m.ModelID
		}
		identifier := fmt.Sprintf("%s/%s", m.ProviderID, effectiveProviderModelID)
		lookup[m.ModelID] = identifier
		if m.ProviderModelID != "" {
			lookup[m.ProviderModelID] = identifier
		}
	}
	return lookup
}

// generateLlamaStackConfig generates the Llama Stack configuration YAML
func (kc *TokenKubernetesClient) generateLlamaStackConfig(ctx context.Context, namespace string, installModels []models.InstallModel, vectorStores []ValidatedVectorStore, maasClient maas.MaaSClientInterface, userAuthToken string) (string, error) {
	// Create a new config to build
	config := NewDefaultLlamaStackConfig()

	// Create a map of MaaS models for efficient lookup (only call ListModels once)
	maasModelsMap := make(map[string]*models.MaaSModel)
	if maasClient != nil {
		// Check if we have any MaaS models first
		hasMaaSModels := false
		for _, model := range installModels {
			if model.ModelSourceType == models.ModelSourceTypeMaaS {
				hasMaaSModels = true
				break
			}
		}

		if hasMaaSModels {
			if userAuthToken == "" {
				return "", fmt.Errorf("user auth token is required to list MaaS models")
			}
			maasModels, err := maasClient.ListModels(ctx, userAuthToken)
			if err != nil {
				kc.Logger.Error("failed to list MaaS models", "error", err)
				return "", fmt.Errorf("failed to list MaaS models: %w", err)
			}

			// Create map for efficient lookup
			for i := range maasModels {
				model := &maasModels[i]
				maasModelsMap[model.ID] = model
			}

			kc.Logger.Debug("loaded MaaS models into map", "count", len(maasModelsMap))
		}
	}

	// Add the default embedding model
	defaultEmbeddingModel := constants.DefaultEmbeddingModel()
	embeddingModel := NewEmbeddingModel(
		defaultEmbeddingModel.ModelID,
		defaultEmbeddingModel.ProviderID,
		defaultEmbeddingModel.ProviderModelID,
		int(defaultEmbeddingModel.EmbeddingDimension),
	)
	config.AddModel(embeddingModel)

	// Pre-fetch the external models ConfigMap once if any external models are present
	var externalModelsConfig *models.ExternalModelsConfig
	for _, model := range installModels {
		if models.IsExternalModelSource(model.ModelSourceType) {
			cfg, err := kc.GetExternalModelsConfig(ctx, namespace)
			if err != nil {
				if apierrors.IsNotFound(err) {
					return "", fmt.Errorf("external models ConfigMap not found in namespace %s", namespace)
				}
				return "", fmt.Errorf("failed to get external models ConfigMap: %w", err)
			}
			externalModelsConfig = cfg
			kc.Logger.Debug("loaded external models ConfigMap", "namespace", namespace)
			break
		}
	}

	for i, model := range installModels {
		kc.Logger.Debug("Processing model for installation", "model", model.ModelName, "modelSourceType", model.ModelSourceType)
		if model.ModelSourceType == models.ModelSourceTypeMaaS {
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
			resolvedMaaSType := model.ModelType
			if resolvedMaaSType == "" {
				resolvedMaaSType = "llm"
			}
			config.AddVLLMProviderAndModel(providerID, endpointURL, i, maasModel.ID, resolvedMaaSType, nil, model.MaxTokens, model.EmbeddingDimension)
			kc.Logger.Info("Added MaaS model to configuration", "model", maasModel.ID, "endpoint", endpointURL, "maxTokens", model.MaxTokens)
		} else if models.IsExternalModelSource(model.ModelSourceType) {
			// Handle external models from ConfigMap
			kc.Logger.Debug("Handling as external model", "model", model.ModelName, "modelSourceType", model.ModelSourceType)
			extDetails, err := kc.getExternalModelDetails(externalModelsConfig, model.ModelName)
			if err != nil {
				kc.Logger.Error("failed to get external model details", "model", model.ModelName, "error", err)
				return "", fmt.Errorf("cannot find external model '%s': %w", model.ModelName, err)
			}

			// Custom endpoint models don't use env vars - secrets fetched at runtime by Llama Stack
			resolvedExtType := model.ModelType
			if resolvedExtType == "" {
				resolvedExtType = extDetails.modelType
			}
			config.AddCustomEndpointProviderAndModel(extDetails.providerID, extDetails.endpointURL, i, extDetails.modelID, resolvedExtType, extDetails.providerType, extDetails.metadata, model.MaxTokens, model.EmbeddingDimension, model.IsClusterLocal)
			kc.Logger.Info("Added custom endpoint model to configuration", "model", extDetails.modelID, "providerID", extDetails.providerID, "endpoint", extDetails.endpointURL, "maxTokens", model.MaxTokens)
		} else {
			// Handle regular cluster models (InferenceService/LLMInferenceService)
			kc.Logger.Debug("Handling as cluster model", "model", model.ModelName, "modelSourceType", model.ModelSourceType)
			details, err := kc.getModelDetailsFromServingRuntime(ctx, namespace, model.ModelName)
			if err != nil {
				kc.Logger.Error("failed to get model details from serving runtime", "model", model.ModelName, "error", err)
				return "", fmt.Errorf("cannot determine endpoint for model '%s': %w", model.ModelName, err)
			}

			providerID := fmt.Sprintf("vllm-inference-%d", i+1)

			resolvedClusterType := model.ModelType
			if resolvedClusterType == "" {
				resolvedClusterType = details.modelType
			}
			config.AddVLLMProviderAndModel(providerID, details.endpointURL, i, details.modelID, resolvedClusterType, details.metadata, model.MaxTokens, model.EmbeddingDimension)
			kc.Logger.Info("Added cluster model to configuration", "model", details.modelID, "providerID", providerID, "endpoint", details.endpointURL, "maxTokens", model.MaxTokens)
		}
	}

	// Vector stores processing happens here after all the model providers above have been processed.
	// This allows us to know the full list of models, including default embedding model, to be included,
	// and thus to validate that each vector store collection has an associated embedding model that will be available.
	if len(vectorStores) > 0 {
		// Build a map from user-supplied embedding_model in gen-ai-aa-vector-stores ConfigMap → full LlamaStack identifier.
		embeddingModelLookup := buildEmbeddingModelLookup(config.RegisteredResources.Models)

		// Collect built-in/default VectorIO provider IDs so we can detect collisions with external providers.
		builtinProviderIDs := make(map[string]bool, len(config.Providers.VectorIO))
		for _, p := range config.Providers.VectorIO {
			builtinProviderIDs[p.ProviderID] = true
		}

		// Track which external providers have already been added (dedup when multiple vector stores share one provider).
		addedProviders := make(map[string]bool)

		for _, vs := range vectorStores {
			rs := vs.RegisteredStore

			// Resolve the gen-ai-aa-vector-stores ConfigMap supplied embedding_model (bare provider_model_id) to the full
			// LlamaStack identifier (provider_id/effective_provider_model_id).
			resolvedEmbeddingModel, ok := embeddingModelLookup[rs.EmbeddingModel]
			if !ok {
				return "", fmt.Errorf("vector store %q requires embedding model %q but it's not included in the registered models", rs.VectorStoreID, rs.EmbeddingModel)
			}

			// Add the provider once, copying the pass-through config fields and injecting the credential env var ref.
			if !addedProviders[vs.Provider.ProviderID] {
				if builtinProviderIDs[vs.Provider.ProviderID] {
					return "", fmt.Errorf("external vector store provider %q conflicts with a built-in provider ID; choose a unique provider_id", vs.Provider.ProviderID)
				}
				providerConfig := make(map[string]interface{}, len(vs.Provider.Config.Extra))
				for k, v := range vs.Provider.Config.Extra {
					providerConfig[k] = v
				}
				// Ensure persistence is present (in some providers LSD pod will crash if not included).
				// Use the user-supplied value if present; otherwise inject a safe default.
				if _, hasPersistence := providerConfig["persistence"]; !hasPersistence {
					providerConfig["persistence"] = map[string]interface{}{
						"backend":   "kv_default",
						"namespace": fmt.Sprintf("vector_io::%s", vs.Provider.ProviderID),
					}
					kc.Logger.Info("injected default persistence config for provider", "providerID", vs.Provider.ProviderID, "providerType", vs.Provider.ProviderType)
				}
				if vs.CredEnvVarName != "" {
					providerConfig[vs.CredSecretRef.Key] = fmt.Sprintf("${env.%s:=}", vs.CredEnvVarName)
				}
				config.AddVectorIOProvider(Provider{
					ProviderID:   vs.Provider.ProviderID,
					ProviderType: vs.Provider.ProviderType,
					Config:       providerConfig,
				})
				addedProviders[vs.Provider.ProviderID] = true
			}

			vsEntry := VectorStore{
				ProviderID:            rs.ProviderID,
				VectorStoreID:         rs.VectorStoreID,
				EmbeddingModel:        resolvedEmbeddingModel,
				EmbeddingDimension:    rs.EmbeddingDimension,
				VectorStoreName:       rs.VectorStoreName,
				ProviderVectorStoreID: rs.ProviderVectorStoreID,
			}
			if rs.Metadata.Description != "" {
				vsEntry.Metadata = map[string]interface{}{"description": rs.Metadata.Description}
			}
			config.RegisterVectorStore(vsEntry)

			kc.Logger.Info("Added external vector store to configuration",
				"vectorStoreID", rs.VectorStoreID, "providerID", vs.Provider.ProviderID, "providerType", vs.Provider.ProviderType, "embeddingModel", rs.EmbeddingModel, "vectorStoreName", rs.VectorStoreName)
		}
	}

	// Ensure storage field is present before serialization (defensive check)
	config.EnsureStorageField()

	// Optionally enable RBAC authentication using Kubernetes auth provider.
	// Gated behind ENABLE_LLAMASTACK_RBAC env var / --enable-llamastack-rbac flag
	// to avoid breaking existing deployments that may not have the expected
	// OpenShift group memberships or token forwarding configured.
	// When enabled, this configures the LlamaStack server to validate tokens against
	// the Kubernetes API server and enforce access policies based on OpenShift roles:
	//   - admin group: full access (create, read, delete)
	//   - system:authenticated: read-only access
	if kc.EnvConfig.EnableLlamaStackRBAC {
		config.EnableRBACAuth("", "")
		kc.Logger.Debug("Enabled RBAC auth with Kubernetes provider for LlamaStack config")
	} else {
		kc.Logger.Debug("RBAC auth is disabled for LlamaStack config (set ENABLE_LLAMASTACK_RBAC=true to enable)")
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

// GetExternalModelsConfig retrieves and parses the gen-ai-aa-custom-model-endpoints ConfigMap
func (kc *TokenKubernetesClient) GetExternalModelsConfig(ctx context.Context, namespace string) (*models.ExternalModelsConfig, error) {
	// Get the ConfigMap
	configMap := &corev1.ConfigMap{}
	configMapName := types.NamespacedName{
		Name:      constants.ExternalModelsConfigMapName,
		Namespace: namespace,
	}

	if err := kc.Client.Get(ctx, configMapName, configMap); err != nil {
		return nil, err
	}

	// Parse the ConfigMap YAML
	configYAML, ok := configMap.Data["config.yaml"]
	if !ok || configYAML == "" {
		return nil, fmt.Errorf("ConfigMap %s has no config.yaml data", constants.ExternalModelsConfigMapName)
	}

	var config models.ExternalModelsConfig
	if err := yaml.Unmarshal([]byte(configYAML), &config); err != nil {
		return nil, fmt.Errorf("failed to parse external models ConfigMap YAML: %w", err)
	}

	// Validate the config before returning
	if err := kc.validateExternalModelsConfig(&config); err != nil {
		return nil, fmt.Errorf("invalid external models ConfigMap: %w", err)
	}

	return &config, nil
}

// validateExternalModelsConfig validates the external models configuration
func (kc *TokenKubernetesClient) validateExternalModelsConfig(config *models.ExternalModelsConfig) error {
	// Validate inference providers
	for i, provider := range config.Providers.Inference {
		// Validate ProviderID is non-empty
		if provider.ProviderID == "" {
			return fmt.Errorf("provider at index %d has empty provider_id", i)
		}

		// Validate ProviderType is remote::openai or remote::passthrough
		if provider.ProviderType != models.ProviderTypeOpenAI && provider.ProviderType != models.ProviderTypePassThrough {
			return fmt.Errorf("provider '%s' has invalid provider_type '%s', must be remote::openai or remote::passthrough", provider.ProviderID, provider.ProviderType)
		}

		// Validate BaseURL is a well-formed URL with scheme and host
		if provider.Config.BaseURL == "" {
			return fmt.Errorf("provider '%s' has empty base_url", provider.ProviderID)
		}

		// TODO: Add feature flag check for externalModel and respect it here
		parsedURL, err := url.Parse(provider.Config.BaseURL)
		if err != nil {
			return fmt.Errorf("provider '%s' has malformed base_url '%s': %w", provider.ProviderID, provider.Config.BaseURL, err)
		}

		if parsedURL.Scheme == "" {
			return fmt.Errorf("provider '%s' base_url '%s' is missing scheme (http/https)", provider.ProviderID, provider.Config.BaseURL)
		}

		if parsedURL.Host == "" {
			return fmt.Errorf("provider '%s' base_url '%s' is missing host", provider.ProviderID, provider.Config.BaseURL)
		}
	}

	// Build provider lookup map for model validation
	providerIDMap := make(map[string]bool)
	for _, provider := range config.Providers.Inference {
		providerIDMap[provider.ProviderID] = true
	}

	// Validate registered models
	for i, model := range config.RegisteredResources.Models {
		// Validate ModelID is non-empty
		if model.ModelID == "" {
			return fmt.Errorf("model at index %d has empty model_id", i)
		}

		// Validate ProviderID is non-empty
		if model.ProviderID == "" {
			return fmt.Errorf("model '%s' has empty provider_id", model.ModelID)
		}

		// Validate ProviderID exists in config.Providers.Inference
		if !providerIDMap[model.ProviderID] {
			return fmt.Errorf("model '%s' references non-existent provider_id '%s'", model.ModelID, model.ProviderID)
		}

		// Validate ModelType matches the allowlist
		validModelTypes := map[models.ModelTypeEnum]bool{
			models.ModelTypeLLM:       true,
			models.ModelTypeEmbedding: true,
		}
		if !validModelTypes[model.ModelType] {
			return fmt.Errorf("model '%s' has invalid model_type '%s', must be 'llm' or 'embedding'", model.ModelID, model.ModelType)
		}

		// Validate EmbeddingDimension if present
		if model.Metadata.EmbeddingDimension != nil {
			dim := *model.Metadata.EmbeddingDimension
			if dim <= 0 {
				return fmt.Errorf("model '%s' has invalid embedding_dimension %d, must be > 0", model.ModelID, dim)
			}
			if dim > 100000 {
				return fmt.Errorf("model '%s' has unreasonably large embedding_dimension %d, must be <= 100000", model.ModelID, dim)
			}
		}
	}

	return nil
}

// getExternalModelDetails retrieves external model details from a pre-fetched ExternalModelsConfig.
func (kc *TokenKubernetesClient) getExternalModelDetails(config *models.ExternalModelsConfig, modelID string) (externalModelDetailsResult, error) {
	// Find the model by model_id
	var foundModel *models.RegisteredModel
	for i := range config.RegisteredResources.Models {
		if config.RegisteredResources.Models[i].ModelID == modelID {
			foundModel = &config.RegisteredResources.Models[i]
			break
		}
	}

	if foundModel == nil {
		return externalModelDetailsResult{}, fmt.Errorf("external model with model_id '%s' not found in ConfigMap", modelID)
	}

	// Find the provider for this model
	var foundProvider *models.InferenceProvider
	for i := range config.Providers.Inference {
		if config.Providers.Inference[i].ProviderID == foundModel.ProviderID {
			foundProvider = &config.Providers.Inference[i]
			break
		}
	}

	if foundProvider == nil {
		return externalModelDetailsResult{}, fmt.Errorf("provider '%s' for external model '%s' not found in ConfigMap", foundModel.ProviderID, modelID)
	}

	// Build metadata
	// Note: secret_ref is NOT included - secrets are fetched at runtime from the ConfigMap by Llama Stack
	metadata := map[string]interface{}{}
	if foundModel.Metadata.DisplayName != "" {
		metadata["display_name"] = foundModel.Metadata.DisplayName
	}
	if foundModel.Metadata.CustomGenAI != nil && foundModel.Metadata.CustomGenAI.UseCases != "" {
		metadata["use_cases"] = foundModel.Metadata.CustomGenAI.UseCases
	}
	if foundModel.Metadata.EmbeddingDimension != nil {
		metadata["embedding_dimension"] = *foundModel.Metadata.EmbeddingDimension
	}

	return externalModelDetailsResult{
		modelID:      foundModel.ModelID,
		modelType:    string(foundModel.ModelType),
		metadata:     metadata,
		endpointURL:  foundProvider.Config.BaseURL,
		providerType: string(foundProvider.ProviderType),
		providerID:   foundModel.ProviderID,
	}, nil
}

// getModelDetailsFromServingRuntime queries the serving runtime and inference service
// to get detailed model configuration information
func (kc *TokenKubernetesClient) getModelDetailsFromServingRuntime(ctx context.Context, namespace string, modelID string) (modelDetailsResult, error) {
	// First try to find InferenceService by name
	targetISVC, err := kc.findInferenceServiceByModelName(ctx, namespace, modelID)
	if err != nil {
		kc.Logger.Warn("unable to find InferenceService for model, trying LLMInferenceService", "modelID", modelID, "error", err)

		// Fallback to LLMInferenceService
		targetLLMSVC, llmErr := kc.findLLMInferenceServiceByModelName(ctx, namespace, modelID)
		if llmErr != nil {
			kc.Logger.Error("failed to find both InferenceService and LLMInferenceService for model", "modelID", modelID, "inferenceServiceError", err, "llmInferenceServiceError", llmErr)
			return modelDetailsResult{}, fmt.Errorf("neither InferenceService nor LLMInferenceService for model '%s' found: InferenceService error: %w, LLMInferenceService error: %w", modelID, err, llmErr)
		}

		// Extract endpoint from LLMInferenceService
		endpointURL, extractErr := kc.extractEndpointFromLLMInferenceService(ctx, targetLLMSVC)
		if extractErr != nil {
			kc.Logger.Error("failed to extract endpoint from LLMInferenceService", "modelID", modelID, "error", extractErr)
			return modelDetailsResult{}, fmt.Errorf("failed to extract endpoint from LLMInferenceService for model '%s': %w", modelID, extractErr)
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

		// Use the actual model name from LLMInferenceService spec instead of service name
		actualModelName := *targetLLMSVC.Spec.Model.Name
		kc.Logger.Debug("using LLMInferenceService for model", "serviceName", modelID, "actualModelName", actualModelName, "endpoint", endpointURL)
		return modelDetailsResult{
			modelID:     actualModelName,
			modelType:   "llm",
			metadata:    metadata,
			endpointURL: endpointURL,
		}, nil
	}

	// Extract the internal URL from the InferenceService status
	// Use Status.URL which is already the internal HTTP address
	if targetISVC.Status.Address.URL == nil {
		kc.Logger.Error("InferenceService has no internal URL", "name", targetISVC.Name, "namespace", namespace)
		return modelDetailsResult{}, fmt.Errorf("InferenceService '%s' has no internal URL - service may not be ready", targetISVC.Name)
	}

	// When routes are enabled, the Status.URL is the route URL, not the internal URL so we use the Address.URL
	internalURL := targetISVC.Status.Address.URL.URL()

	if targetISVC.Annotations[authAnnotationKey] != "true" {
		// For non-auth services, ensure http scheme
		if internalURL.Scheme == "https" {
			internalURL.Scheme = "http"
		}
	}

	// Find services owned by this InferenceService
	services, err := kc.findServicesForKServeResource(ctx, namespace, targetISVC)
	if err != nil {
		kc.Logger.Warn("failed to find services for InferenceService", "name", targetISVC.Name, "error", err)
	} else if len(services) == 0 {
		kc.Logger.Warn("no services found for InferenceService", "name", targetISVC.Name)
	} else {
		svc := services[0]
		isHeadless := kc.isHeadlessService(ctx, namespace, svc.Name)
		port := kc.getServingPort(ctx, namespace, svc.Name)
		urlHasPort := internalURL.Port() != ""

		if ShouldAddPortToURL(isHeadless, urlHasPort) {
			internalURL.Host = fmt.Sprintf("%s:%d", internalURL.Hostname(), port)
			kc.Logger.Debug("headless kserve detected: HeadlessService is used; adding target port to internal URL",
				"service", svc.Name, "port", port, "url", internalURL.String())
		}
	}

	internalURLStr := internalURL.String()
	// Add /v1 suffix if not present
	internalURLStr = EnsureV1Suffix(internalURLStr)

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

	kc.Logger.Debug("Using InferenceService for model", "modelID", modelID, "endpoint", internalURLStr)
	return modelDetailsResult{
		modelID:     strings.ReplaceAll(modelID, ":", "-"),
		modelType:   "llm",
		metadata:    metadata,
		endpointURL: internalURLStr,
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

// findServicesForKServeResource finds services associated with a KServe resource (InferenceService or LLMInferenceService)
func (kc *TokenKubernetesClient) findServicesForKServeResource(ctx context.Context, namespace string, isvc metav1.Object) ([]corev1.Service, error) {
	var svcList corev1.ServiceList

	// Try InferenceService label first
	labelSelector := labels.SelectorFromSet(map[string]string{
		InferenceServiceName: isvc.GetName(),
	})

	listOptions := &client.ListOptions{
		Namespace:     namespace,
		LabelSelector: labelSelector,
	}

	if err := kc.Client.List(ctx, &svcList, listOptions); err != nil {
		return nil, err
	}

	// If not found, try LLMInferenceService workload service labels
	if len(svcList.Items) == 0 {
		labelSelector = labels.SelectorFromSet(map[string]string{
			LLMInferenceServiceName:      isvc.GetName(),
			LLMInferenceServiceComponent: LLMInferenceServiceWorkloadComponent,
		})
		listOptions.LabelSelector = labelSelector

		if err := kc.Client.List(ctx, &svcList, listOptions); err != nil {
			return nil, err
		}
	}

	// Filter by owner reference to ensure we only get services owned by this InferenceService/LLMInferenceService
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
			kc.Logger.Debug("Found InferenceService by model name", "modelName", modelName, "isvcName", isvc.Name, "namespace", namespace)
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
			kc.Logger.Debug("found LLMInferenceService by model name", "modelName", modelName, "llmSvcName", llmSvc.Name, "namespace", namespace)
			return &llmSvc, nil
		}
	}

	return nil, fmt.Errorf("LLMInferenceService with model name '%s' not found in namespace %s", modelName, namespace)
}

// extractEndpointFromLLMInferenceService extracts the endpoint URL from LLMInferenceService by constructing internal URL from its Service
func (kc *TokenKubernetesClient) extractEndpointFromLLMInferenceService(ctx context.Context, llmSvc *kservev1alpha1.LLMInferenceService) (string, error) {
	// Find services owned by this LLMInferenceService
	services, err := kc.findServicesForKServeResource(ctx, llmSvc.Namespace, llmSvc)
	if err != nil {
		kc.Logger.Error("failed to find services for LLMInferenceService", "name", llmSvc.Name, "error", err)
		return "", fmt.Errorf("failed to find services for LLMInferenceService '%s': %w", llmSvc.Name, err)
	}
	if len(services) == 0 {
		kc.Logger.Error("no services found for LLMInferenceService", "name", llmSvc.Name, "namespace", llmSvc.Namespace)
		return "", fmt.Errorf("no services found for LLMInferenceService '%s' - service may not be ready", llmSvc.Name)
	}

	// Use the first service to construct internal URL
	svc := services[0]
	port := kc.getServingPort(ctx, llmSvc.Namespace, svc.Name)

	// Determine scheme based on authentication annotation
	var authAnnotation string
	if llmSvc.Annotations != nil {
		authAnnotation = llmSvc.Annotations[authAnnotationKey]
	}
	scheme := DetermineSchemeFromAuth(authAnnotation)

	// Construct internal URL from service name with port
	// LLMInferenceService workload services (KServe headless mode) always require port
	internalURL := ConstructLLMInferenceServiceURL(scheme, svc.Name, llmSvc.Namespace, port)

	kc.Logger.Debug("constructed internal URL for LLMInferenceService",
		"llmServiceName", llmSvc.Name,
		"k8sServiceName", svc.Name,
		"port", port,
		"endpoint", internalURL)

	return internalURL, nil
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

// GetInferenceServiceURL returns the internal endpoint URL for the InferenceService or
// LLMInferenceService whose K8s resource name equals modelName.
// Returns ("", nil) when no matching resource is found so callers can fall back gracefully.
func (kc *TokenKubernetesClient) GetInferenceServiceURL(ctx context.Context, _ *integrations.RequestIdentity, namespace string, modelName string) (string, error) {
	details, err := kc.getModelDetailsFromServingRuntime(ctx, namespace, modelName)
	if err != nil {
		kc.Logger.Debug("GetInferenceServiceURL: no InferenceService/LLMInferenceService found",
			"namespace", namespace, "modelName", modelName, "error", err)
		return "", nil
	}
	return details.endpointURL, nil
}

// GetModelProviderInfo retrieves provider configuration for a model from LlamaStackConfig
func (kc *TokenKubernetesClient) GetModelProviderInfo(ctx context.Context, identity *integrations.RequestIdentity, namespace string, modelID string) (*genaitypes.ModelProviderInfo, error) {
	// Get LlamaStackDistribution
	config, err := kc.loadLlamaStackConfig(ctx, identity, namespace)
	if config == nil {
		return nil, err
	}
	// Get model provider info from config
	return config.GetModelProviderInfo(modelID)
}

// loadLlamaStackConfig loads the LlamaStack configuration from a ConfigMap in the cluster
func (kc *TokenKubernetesClient) loadLlamaStackConfig(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (*LlamaStackConfig, error) {
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

	// Read config.yaml (llama-stack v0.4.0+)
	configYAML, ok := configMap.Data[constants.LlamaStackConfigYAMLKey]
	if !ok {
		return nil, fmt.Errorf("config.yaml not found in configmap")
	}

	// Parse YAML into config
	var config LlamaStackConfig
	if err := config.FromYAML(configYAML); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

	config.EnsureStorageField()

	return &config, nil
}

// GenerateProviderID generates a unique provider ID for external models
func (kc *TokenKubernetesClient) GenerateProviderID(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (string, error) {
	configMap, err := kc.GetConfigMap(ctx, identity, namespace, constants.ExternalModelsConfigMapName)
	if err != nil {
		// If ConfigMap doesn't exist, start with ID 1
		if apierrors.IsNotFound(err) {
			return "1", nil
		}
		return "", fmt.Errorf("failed to get ConfigMap: %w", err)
	}

	// Parse existing config to count providers
	configYAML, ok := configMap.Data["config.yaml"]
	if !ok || configYAML == "" {
		return "1", nil
	}

	var config models.ExternalModelsConfig
	if err := yaml.Unmarshal([]byte(configYAML), &config); err != nil {
		return "", fmt.Errorf("failed to parse ConfigMap YAML: %w", err)
	}

	// Generate next ID by finding the maximum existing ID
	// This prevents collisions when providers are deleted or reordered
	maxID := 0
	for _, provider := range config.Providers.Inference {
		// Provider IDs are in format "endpoint-{id}"
		// Extract the numeric ID part
		idStr := strings.TrimPrefix(provider.ProviderID, "endpoint-")
		if id, err := strconv.Atoi(idStr); err == nil {
			if id > maxID {
				maxID = id
			}
		} else {
			// Log non-numeric IDs but continue
			kc.Logger.Warn("skipping non-numeric provider ID", "providerID", provider.ProviderID, "error", err)
		}
	}

	nextID := maxID + 1
	return fmt.Sprintf("%d", nextID), nil
}

// CreateExternalModelSecret creates a Kubernetes Secret for the external model API key
func (kc *TokenKubernetesClient) CreateExternalModelSecret(ctx context.Context, identity *integrations.RequestIdentity, namespace string, secretName string, secretValue string) error {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

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

	if err := kc.Client.Create(ctx, secret); err != nil {
		kc.Logger.Error("failed to create secret", "error", err, "namespace", namespace, "secretName", secretName)
		return fmt.Errorf("failed to create secret: %w", err)
	}

	kc.Logger.Info("successfully created secret", "namespace", namespace, "secretName", secretName)
	return nil
}

// CreateOrUpdateExternalModelConfigMap creates or updates the gen-ai-aa-custom-model-endpoints ConfigMap
func (kc *TokenKubernetesClient) CreateOrUpdateExternalModelConfigMap(ctx context.Context, identity *integrations.RequestIdentity, namespace string, providerID string, secretName string, req models.ExternalModelRequest) error {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Try to get existing ConfigMap
	configMap, err := kc.GetConfigMap(ctx, identity, namespace, constants.ExternalModelsConfigMapName)

	var config models.ExternalModelsConfig
	if err != nil {
		if !apierrors.IsNotFound(err) {
			return fmt.Errorf("failed to get ConfigMap: %w", err)
		}
		// ConfigMap doesn't exist, initialize empty config
		config = models.ExternalModelsConfig{
			Providers: models.ProvidersConfig{
				Inference: []models.InferenceProvider{},
			},
			RegisteredResources: models.RegisteredResourcesConfig{
				Models: []models.RegisteredModel{},
			},
		}
	} else {
		// ConfigMap exists, parse it
		configYAML, ok := configMap.Data["config.yaml"]
		if !ok || configYAML == "" {
			// Initialize empty config if data is missing
			config = models.ExternalModelsConfig{
				Providers: models.ProvidersConfig{
					Inference: []models.InferenceProvider{},
				},
				RegisteredResources: models.RegisteredResourcesConfig{
					Models: []models.RegisteredModel{},
				},
			}
		} else {
			if err := yaml.Unmarshal([]byte(configYAML), &config); err != nil {
				return fmt.Errorf("failed to parse ConfigMap YAML: %w", err)
			}
		}
	}

	// Select provider type based on model type: embedding models use passthrough, inference models use openai
	providerType := models.ProviderTypeOpenAI
	if req.ModelType == models.ModelTypeEmbedding {
		providerType = models.ProviderTypePassThrough
	}

	newProvider := models.InferenceProvider{
		ProviderID:   fmt.Sprintf("endpoint-%s", providerID),
		ProviderType: providerType,
		Config: models.ProviderConfig{
			BaseURL: req.BaseURL,
			CustomGenAI: models.CustomGenAI{
				APIKey: models.APIKeyConfig{
					SecretRef: models.SecretRef{
						Name: secretName,
						Key:  "api_key",
					},
				},
			},
		},
	}

	// For OpenAI provider, add allowed_models
	if providerType == models.ProviderTypeOpenAI {
		newProvider.Config.AllowedModels = []string{req.ModelID}
	}

	config.Providers.Inference = append(config.Providers.Inference, newProvider)

	// Add new registered model
	newModel := models.RegisteredModel{
		ProviderID: fmt.Sprintf("endpoint-%s", providerID),
		ModelID:    req.ModelID,
		ModelType:  req.ModelType,
		Metadata: models.RegisteredModelMetadata{
			DisplayName:        req.ModelDisplayName,
			EmbeddingDimension: req.EmbeddingDimension,
		},
	}

	// Add custom_gen_ai metadata if use_cases is provided
	if req.UseCases != "" {
		newModel.Metadata.CustomGenAI = &models.RegisteredModelCustomGenAI{
			UseCases: req.UseCases,
		}
	}

	config.RegisteredResources.Models = append(config.RegisteredResources.Models, newModel)

	// Convert to YAML
	configYAML, err := yaml.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal config to YAML: %w", err)
	}

	// Create or update ConfigMap
	if configMap == nil {
		// Create new ConfigMap
		newConfigMap := &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{
				Name:      constants.ExternalModelsConfigMapName,
				Namespace: namespace,
			},
			Data: map[string]string{
				"config.yaml": string(configYAML),
			},
		}

		if err := kc.Client.Create(ctx, newConfigMap); err != nil {
			kc.Logger.Error("failed to create ConfigMap", "error", err, "namespace", namespace)
			return fmt.Errorf("failed to create ConfigMap: %w", err)
		}
		kc.Logger.Info("successfully created ConfigMap", "namespace", namespace, "configMapName", constants.ExternalModelsConfigMapName)
	} else {
		// Update existing ConfigMap
		// Initialize Data map if nil to prevent panic
		if configMap.Data == nil {
			configMap.Data = map[string]string{}
		}
		configMap.Data["config.yaml"] = string(configYAML)
		if err := kc.Client.Update(ctx, configMap); err != nil {
			kc.Logger.Error("failed to update ConfigMap", "error", err, "namespace", namespace)
			return fmt.Errorf("failed to update ConfigMap: %w", err)
		}
		kc.Logger.Info("successfully updated ConfigMap", "namespace", namespace, "configMapName", constants.ExternalModelsConfigMapName)
	}

	return nil
}

// DeleteExternalModel deletes an external model by removing its entry from the ConfigMap and deleting its Secret
func (kc *TokenKubernetesClient) DeleteExternalModel(ctx context.Context, identity *integrations.RequestIdentity, namespace string, modelID string) error {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Get existing ConfigMap
	configMap, err := kc.GetConfigMap(ctx, identity, namespace, constants.ExternalModelsConfigMapName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			return fmt.Errorf("external models ConfigMap not found in namespace %s: %w", namespace, ErrExternalModelNotFound)
		}
		return fmt.Errorf("failed to get ConfigMap: %w", err)
	}

	// Parse the ConfigMap
	configYAML, ok := configMap.Data["config.yaml"]
	if !ok || configYAML == "" {
		kc.Logger.Warn("ConfigMap exists but has no config.yaml data", "namespace", namespace, "configMapName", constants.ExternalModelsConfigMapName)
		return fmt.Errorf("ConfigMap has no config.yaml data")
	}

	var config models.ExternalModelsConfig
	if err := yaml.Unmarshal([]byte(configYAML), &config); err != nil {
		kc.Logger.Warn("ConfigMap exists but config.yaml data is invalid", "namespace", namespace, "configMapName", constants.ExternalModelsConfigMapName)
		return fmt.Errorf("failed to parse ConfigMap YAML: %w", err)
	}

	// Find the provider that contains this model ID
	var providerIDToDelete string
	var secretNameToDelete string
	modelFound := false

	for i, model := range config.RegisteredResources.Models {
		if model.ModelID == modelID {
			modelFound = true
			providerIDToDelete = model.ProviderID

			// Remove the model from the list
			config.RegisteredResources.Models = append(
				config.RegisteredResources.Models[:i],
				config.RegisteredResources.Models[i+1:]...,
			)
			break
		}
	}

	if !modelFound {
		return fmt.Errorf("model %s: %w", modelID, ErrExternalModelNotFound)
	}

	// Find and remove the provider, and get the secret name
	providerFound := false
	for i, provider := range config.Providers.Inference {
		if provider.ProviderID == providerIDToDelete {
			secretNameToDelete = provider.Config.CustomGenAI.APIKey.SecretRef.Name
			providerFound = true

			// Remove the provider from the list
			config.Providers.Inference = append(
				config.Providers.Inference[:i],
				config.Providers.Inference[i+1:]...,
			)
			break
		}
	}

	if !providerFound {
		return fmt.Errorf("provider %s not found in ConfigMap (model exists but provider is missing)", providerIDToDelete)
	}

	// Update the ConfigMap with the modified config
	updatedConfigYAML, err := yaml.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal updated config to YAML: %w", err)
	}

	configMap.Data["config.yaml"] = string(updatedConfigYAML)
	if err := kc.Client.Update(ctx, configMap); err != nil {
		kc.Logger.Error("failed to update ConfigMap", "error", err, "namespace", namespace)
		return fmt.Errorf("failed to update ConfigMap: %w", err)
	}

	kc.Logger.Info("successfully removed model from ConfigMap", "namespace", namespace, "modelID", modelID)

	// Delete the associated Secret
	if secretNameToDelete != "" {
		if err := kc.DeleteSecret(ctx, identity, namespace, secretNameToDelete); err != nil {
			// If the secret is already gone, that's fine (idempotent)
			if !apierrors.IsNotFound(err) {
				return fmt.Errorf("failed to delete associated secret %s: %w", secretNameToDelete, err)
			}
			kc.Logger.Info("secret already deleted or not found", "secretName", secretNameToDelete)
		} else {
			kc.Logger.Info("successfully deleted associated secret", "secretName", secretNameToDelete)
		}
	}

	return nil
}

// DeleteSecret deletes a Kubernetes Secret
func (kc *TokenKubernetesClient) DeleteSecret(ctx context.Context, identity *integrations.RequestIdentity, namespace string, secretName string) error {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      secretName,
			Namespace: namespace,
		},
	}

	if err := kc.Client.Delete(ctx, secret); err != nil {
		kc.Logger.Error("failed to delete Secret", "error", err, "namespace", namespace, "secretName", secretName)
		return fmt.Errorf("failed to delete Secret: %w", err)
	}

	kc.Logger.Info("successfully deleted Secret", "namespace", namespace, "secretName", secretName)
	return nil
}

// GetSecretValue retrieves a specific value from a Kubernetes Secret
func (kc *TokenKubernetesClient) GetSecretValue(ctx context.Context, identity *integrations.RequestIdentity, namespace string, secretName string, secretKey string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	secret := &corev1.Secret{}
	secretNamespacedName := types.NamespacedName{
		Name:      secretName,
		Namespace: namespace,
	}

	if err := kc.Client.Get(ctx, secretNamespacedName, secret); err != nil {
		kc.Logger.Error("failed to get Secret", "error", err, "namespace", namespace, "secretName", secretName)
		return "", fmt.Errorf("failed to get Secret: %w", err)
	}

	// Get the value from the secret
	value, ok := secret.Data[secretKey]
	if !ok {
		kc.Logger.Warn("secret key not found in Secret", "namespace", namespace, "secretName", secretName, "secretKey", secretKey)
		return "", fmt.Errorf("key '%s' not found in Secret '%s'", secretKey, secretName)
	}

	kc.Logger.Debug("successfully retrieved secret value", "namespace", namespace, "secretName", secretName, "secretKey", secretKey)
	return string(value), nil
}
