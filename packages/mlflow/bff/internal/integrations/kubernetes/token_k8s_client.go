package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	helper "github.com/opendatahub-io/mlflow/bff/internal/helpers"
	authnv1 "k8s.io/api/authentication/v1"
	authv1 "k8s.io/api/authorization/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type TokenKubernetesClient struct {
	SharedClientLogic
	restConfig *rest.Config
}

func (kc *TokenKubernetesClient) IsClusterAdmin(_ *RequestIdentity) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// We cannot list ClusterRoleBindings here because this client is initialized with a user token,
	// which typically does not have permissions to read cluster-scoped RBAC resources.
	// Instead, we use a SelfSubjectAccessReview with wildcard '*' verb and resource,
	// which safely asks the Kubernetes API server: "Can I do everything?"
	// If the review returns allowed=true, it means the user has cluster-admin-equivalent permissions.
	sar := &authv1.SelfSubjectAccessReview{
		Spec: authv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authv1.ResourceAttributes{
				Verb:     "*",
				Resource: "*",
			},
		},
	}

	resp, err := kc.Client.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		kc.Logger.Error("failed to perform cluster-admin SAR", "error", err)
		return false, fmt.Errorf("failed to verify cluster-admin permissions: %w", err)
	}

	if !resp.Status.Allowed {
		kc.Logger.Info("user is NOT cluster-admin")
		return false, nil
	}

	return true, nil
}

// NewTokenKubernetesClient creates a Kubernetes client using a user bearer token.
// This function is exported to allow downstream code to customize client creation
// by setting TokenClientFactory.NewTokenKubernetesClientFn.
func NewTokenKubernetesClient(token string, logger *slog.Logger) (KubernetesClientInterface, error) {
	baseConfig, err := helper.GetKubeconfig()
	if err != nil {
		logger.Error("failed to get kubeconfig", "error", err)
		return nil, fmt.Errorf("failed to get kubeconfig: %w", err)
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

	clientset, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		logger.Error("failed to create token-based Kubernetes client", "error", err)
		return nil, fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	return &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client: clientset,
			Logger: logger,
			// Token is retained for follow-up calls; do not log it.
			Token: NewBearerToken(token),
		},
		restConfig: cfg,
	}, nil
}

func (kc *TokenKubernetesClient) GetNamespaces(ctx context.Context, _ *RequestIdentity) ([]corev1.Namespace, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	nsList, err := kc.Client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		kc.Logger.Error("failed to list namespaces", "error", err)
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	return nsList.Items, nil
}

func (kc *TokenKubernetesClient) GetUser(_ *RequestIdentity) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	ssr := &authnv1.SelfSubjectReview{
		TypeMeta: metav1.TypeMeta{
			Kind:       "SelfSubjectReview",
			APIVersion: "authentication.k8s.io/v1",
		},
	}

	resp, err := kc.Client.AuthenticationV1().SelfSubjectReviews().Create(ctx, ssr, metav1.CreateOptions{})
	if err != nil {
		kc.Logger.Error("failed to get user identity from token", "error", err)
		return "", fmt.Errorf("failed to get user identity: %w", err)
	}

	username := resp.Status.UserInfo.Username
	if username == "" {
		kc.Logger.Error("user identity not found in token")
		return "", errors.New("no username found in token")
	}

	// If it's a service account, extract the SA name
	const saPrefix = "system:serviceaccount:"
	if strings.HasPrefix(username, saPrefix) {
		parts := strings.SplitN(strings.TrimPrefix(username, saPrefix), ":", 2)
		if len(parts) == 2 {
			return parts[1], nil // Return just the service account name
		}
		kc.Logger.Warn("malformed service account username", "username", username)
	}

	return username, nil
}

// CanWritePromptsInNamespace checks if the user can write prompts to the namespace.
//
// This uses SelfSubjectAccessReview to check permission on
// mlflow.kubeflow.org/registeredmodels resources. This matches the permissions
// granted by the mlflow-edit ClusterRole, which allows:
//   - apiGroups: ["mlflow.kubeflow.org"]
//     resources: ["registeredmodels", "experiments", "runs"]
//     verbs: ["create", "update", "patch", "delete"]
//
// The prompt registry stores prompts as RegisteredModel resources in MLflow.
// The verb parameter must be one of: "create" (for save operations) or "delete"
// (for delete operations) to match the actual operation being performed.
//
// SSAR uses the token bound to this client at construction time (the user's
// forwarded token), so it always checks the authenticated user's permissions.
func (kc *TokenKubernetesClient) CanWritePromptsInNamespace(
	ctx context.Context,
	namespace string,
	verb string,
) (bool, error) {
	// Validate verb to prevent misuse
	if verb != "create" && verb != "delete" {
		return false, &InvalidVerbError{Verb: verb}
	}

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	sar := &authv1.SelfSubjectAccessReview{
		Spec: authv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authv1.ResourceAttributes{
				Namespace: namespace,
				Group:     "mlflow.kubeflow.org",
				Resource:  "registeredmodels",
				Verb:      verb,
			},
		},
	}

	resp, err := kc.Client.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		kc.Logger.Error("failed to check write permissions",
			slog.String("namespace", namespace),
			slog.Any("error", err))
		return false, fmt.Errorf("failed to check write permissions in namespace %s: %w", namespace, err)
	}

	if !resp.Status.Allowed {
		kc.Logger.Warn("permission denied",
			slog.String("namespace", namespace),
			slog.String("verb", verb),
			slog.String("reason", resp.Status.Reason),
			slog.String("evaluation_error", resp.Status.EvaluationError))
	}

	return resp.Status.Allowed, nil
}
