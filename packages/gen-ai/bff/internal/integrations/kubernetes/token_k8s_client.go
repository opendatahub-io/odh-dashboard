package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models/genaiassets"
	authv1 "k8s.io/api/authorization/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
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
		kc.Logger.Info("user is NOT cluster-admin")
		return false, nil
	}

	kc.Logger.Info("user is cluster-admin")
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
func (kc *TokenKubernetesClient) extractEndpoints(isvc *kservev1beta1.InferenceService) []genaiassets.Endpoint {
	endpoints := []genaiassets.Endpoint{}

	// Extract internal endpoint from Address
	if isvc.Status.Address != nil && isvc.Status.Address.URL != nil {
		internalURL := isvc.Status.Address.URL.String()
		endpoints = append(endpoints, genaiassets.Endpoint{
			Internal: &genaiassets.InternalEndpoint{
				URL: internalURL,
			},
		})
	}

	// Extract external endpoint from URL
	if isvc.Status.URL != nil {
		externalURL := isvc.Status.URL.String()
		// Check if we already have an internal endpoint with the same URL
		hasInternalWithSameURL := false
		if len(endpoints) > 0 && endpoints[0].Internal != nil {
			hasInternalWithSameURL = endpoints[0].Internal.URL == externalURL
		}

		// Only add external if it's different from internal
		if !hasInternalWithSameURL {
			// Find service account and API token for external endpoint
			apiToken, serviceAccountName, secretDisplayName := kc.findServiceAccountAndToken(isvc)

			endpoints = append(endpoints, genaiassets.Endpoint{
				External: &genaiassets.ExternalEndpoint{
					URL:                externalURL,
					APIToken:           apiToken,
					ServiceAccountName: serviceAccountName,
					SecretDisplayName:  secretDisplayName,
				},
			})
		}
	}

	return endpoints
}

// findServiceAccountAndToken finds the service account with owner reference to the inference service
// and retrieves the API token from the associated secret
func (kc *TokenKubernetesClient) findServiceAccountAndToken(isvc *kservev1beta1.InferenceService) (string, string, string) {
	ctx := context.Background()
	namespace := isvc.Namespace

	// List all service accounts in the namespace
	var serviceAccountList corev1.ServiceAccountList
	err := kc.Client.List(ctx, &serviceAccountList, client.InNamespace(namespace))
	if err != nil {
		kc.Logger.Error("failed to list service accounts", "error", err, "namespace", namespace)
		return "", "", ""
	}

	// Find service account with owner reference to this inference service
	var targetServiceAccount *corev1.ServiceAccount
	for _, sa := range serviceAccountList.Items {
		for _, ownerRef := range sa.OwnerReferences {
			if ownerRef.UID == isvc.UID {
				targetServiceAccount = &sa
				break
			}
		}
		if targetServiceAccount != nil {
			break
		}
	}

	if targetServiceAccount == nil {
		kc.Logger.Warn("no service account found with owner reference to inference service, endpoint may be unprotected", "inferenceService", isvc.Name)
		return "", "", ""
	}

	// Find the secret for the service account
	secretName, secretDisplayName := kc.findSecretForServiceAccount(ctx, targetServiceAccount.Name)
	if secretName == "" {
		kc.Logger.Warn("no service account token secret found", "serviceAccount", targetServiceAccount.Name)
		return "", targetServiceAccount.Name, ""
	}

	// Get the token from the secret
	token, err := kc.getTokenFromSecret(ctx, secretName, targetServiceAccount.Namespace)
	if err != nil {
		kc.Logger.Error("failed to get token from secret", "error", err, "secretName", secretName)
		return "", targetServiceAccount.Name, secretDisplayName
	}

	kc.Logger.Info("found API token for service account", "serviceAccount", targetServiceAccount.Name, "secret", secretName, "secretDisplayName", secretDisplayName)
	return token, targetServiceAccount.Name, secretDisplayName
}

// findSecretForServiceAccount finds the secret name and display name for a given service account
func (kc *TokenKubernetesClient) findSecretForServiceAccount(ctx context.Context, serviceAccountName string) (string, string) {
	// List all secrets in the cluster
	var secretList corev1.SecretList
	err := kc.Client.List(ctx, &secretList)
	if err != nil {
		kc.Logger.Error("failed to list secrets", "error", err)
		return "", ""
	}

	// Find secret with the service account annotation and correct type
	for _, secret := range secretList.Items {
		// Check if secret has the service account annotation
		if secret.Annotations["kubernetes.io/service-account.name"] == serviceAccountName &&
			secret.Type == corev1.SecretTypeServiceAccountToken {
			// Get display name from openshift.io/display-name annotation
			secretDisplayName := secret.Annotations["openshift.io/display-name"]
			kc.Logger.Info("found secret for service account", "serviceAccount", serviceAccountName, "secret", secret.Name, "secretDisplayName", secretDisplayName)
			return secret.Name, secretDisplayName
		}
	}

	kc.Logger.Warn("no service account token secret found", "serviceAccount", serviceAccountName)
	return "", ""
}

// getTokenFromSecret retrieves the token from a specific secret
func (kc *TokenKubernetesClient) getTokenFromSecret(ctx context.Context, secretName, namespace string) (string, error) {
	var secret corev1.Secret
	key := client.ObjectKey{
		Name:      secretName,
		Namespace: namespace,
	}
	err := kc.Client.Get(ctx, key, &secret)
	if err != nil {
		return "", fmt.Errorf("failed to get secret %s: %w", secretName, err)
	}

	if token, exists := secret.Data["token"]; exists {
		return string(token), nil
	}

	return "", fmt.Errorf("token not found in secret %s", secretName)
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

	kc.Logger.Error("no InferenceService found with display name", "modelName", modelName, "namespace", namespace)
	return nil, fmt.Errorf("no InferenceService found with display name '%s' in namespace %s", modelName, namespace)
}

func (kc *TokenKubernetesClient) InstallLlamaStackDistribution(ctx context.Context, identity *integrations.RequestIdentity, namespace string, modelName string) (*lsdapi.LlamaStackDistribution, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Find InferenceService by display name
	targetISVC, err := kc.findInferenceServiceByDisplayName(ctx, namespace, modelName)
	if err != nil {
		return nil, err
	}

	// Extract the internal URL from the InferenceService status
	if targetISVC.Status.Address == nil || targetISVC.Status.Address.URL == nil {
		kc.Logger.Error("InferenceService has no internal address", "name", targetISVC.Name, "namespace", namespace)
		return nil, fmt.Errorf("InferenceService %s has no internal address - service may not be ready", targetISVC.Name)
	}

	internalURL := targetISVC.Status.Address.URL.String() + "/v1"

	// Get the actual service account name from the InferenceService
	_, serviceAccountName, _ := kc.findServiceAccountAndToken(targetISVC)

	// Find the secret name for the service account
	var secretName, secretDisplayName string
	if serviceAccountName != "" {
		secretName, secretDisplayName = kc.findSecretForServiceAccount(ctx, serviceAccountName)
	}

	// If no secret is found, the endpoint may be unauthenticated - this is okay
	if secretName == "" {
		kc.Logger.Info("no secret found for InferenceService - endpoint may be unauthenticated", "name", modelName, "serviceAccount", serviceAccountName)
	}

	kc.Logger.Info("constructing LlamaStackDistribution",
		"modelName", modelName,
		"isvcName", targetISVC.Name,
		"namespace", namespace,
		"internalURL", internalURL,
		"secretName", secretName,
		"secretDisplayName", secretDisplayName)

	lsd := &lsdapi.LlamaStackDistribution{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "lsd-gen-ai-playground",
			Namespace: namespace,
		},
		Spec: lsdapi.LlamaStackDistributionSpec{
			Replicas: 1,
			Server: lsdapi.ServerSpec{
				Distribution: lsdapi.DistributionType{
					Name: "rh-dev",
				},
				ContainerSpec: lsdapi.ContainerSpec{
					Resources: corev1.ResourceRequirements{
						Requests: corev1.ResourceList{
							"cpu":    resource.MustParse("250m"),
							"memory": resource.MustParse("500Mi"),
						},
						Limits: corev1.ResourceList{
							"cpu":    resource.MustParse("2"),
							"memory": resource.MustParse("12Gi"),
						},
					},
					Env: func() []corev1.EnvVar {
						envVars := []corev1.EnvVar{
							{
								Name:  "INFERENCE_MODEL",
								Value: targetISVC.Name, // Use actual InferenceService name, not display name
							},
							{
								Name:  "VLLM_MAX_TOKENS",
								Value: "4096",
							},
							{
								Name:  "VLLM_URL",
								Value: internalURL,
							},
							{
								// TODO: This may need to be modified. Verify with model registry team.
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
						}

						// Only add VLLM_API_TOKEN if we have a secret
						if secretName != "" {
							envVars = append(envVars, corev1.EnvVar{
								Name: "VLLM_API_TOKEN",
								ValueFrom: &corev1.EnvVarSource{
									SecretKeyRef: &corev1.SecretKeySelector{
										LocalObjectReference: corev1.LocalObjectReference{
											Name: secretName,
										},
										Key: "token",
									},
								},
							})
						}

						return envVars
					}(),
				},
			},
		},
	}

	// Create the LlamaStackDistribution resource
	err = kc.Client.Create(ctx, lsd)
	if err != nil {
		kc.Logger.Error("failed to create LlamaStackDistribution", "error", err, "name", lsd.Name, "namespace", namespace)
		return nil, err
	}

	kc.Logger.Info("successfully created LlamaStackDistribution", "name", lsd.Name, "namespace", namespace)
	return lsd, nil
}
