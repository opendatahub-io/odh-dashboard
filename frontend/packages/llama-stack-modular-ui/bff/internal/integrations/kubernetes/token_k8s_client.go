package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	helper "github.com/opendatahub-io/llama-stack-modular-ui/internal/helpers"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	authv1 "k8s.io/api/authorization/v1"
	corev1 "k8s.io/api/core/v1"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"

	// Import the typed LlamaStackDistribution types
	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
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
