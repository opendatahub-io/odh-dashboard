package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	helper "github.com/opendatahub-io/eval-hub/bff/internal/helpers"
	authnv1 "k8s.io/api/authentication/v1"
	authv1 "k8s.io/api/authorization/v1"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
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

// RESTConfig returns the rest.Config used to create this client.
// This allows downstream code to access the underlying configuration
// for creating additional clients (e.g., dynamic clients).
func (kc *TokenKubernetesClient) RESTConfig() *rest.Config { //nolint:unused
	return kc.restConfig
}

// RequestIdentity is unused because the token already represents the user identity.
func (kc *TokenKubernetesClient) CanListServicesInNamespace(ctx context.Context, _ *RequestIdentity, namespace string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	for _, verb := range []string{"get", "list"} {
		sar := &authv1.SelfSubjectAccessReview{
			Spec: authv1.SelfSubjectAccessReviewSpec{
				ResourceAttributes: &authv1.ResourceAttributes{
					Verb:      verb,
					Resource:  "services",
					Namespace: namespace,
				},
			},
		}

		resp, err := kc.Client.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
		if err != nil {
			kc.Logger.Error("self-SAR failed", "namespace", namespace, "verb", verb, "error", err)
			return false, err
		}

		if !resp.Status.Allowed {
			kc.Logger.Error("self-SAR denied", "namespace", namespace, "verb", verb)
			return false, nil
		}
	}

	return true, nil
}

// RequestIdentity is unused because the token already represents the user identity.
func (kc *TokenKubernetesClient) CanAccessServiceInNamespace(ctx context.Context, _ *RequestIdentity, namespace, serviceName string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	sar := &authv1.SelfSubjectAccessReview{
		Spec: authv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authv1.ResourceAttributes{
				Verb:      "get",
				Resource:  "services",
				Namespace: namespace,
				Name:      serviceName,
			},
		},
	}

	resp, err := kc.Client.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		kc.Logger.Error("self-SAR failed", "service", serviceName, "namespace", namespace, "error", err)
		return false, err
	}
	if !resp.Status.Allowed {
		kc.Logger.Error("self-SAR denied", "service", serviceName, "namespace", namespace)
		return false, nil
	}

	return true, nil
}

// GetNamespaces returns namespaces accessible to the user.
// For cluster admins, returns all namespaces via the core Namespaces API.
// For regular users, falls back to the OpenShift Projects API which returns
// only projects the user has access to.
func (kc *TokenKubernetesClient) GetNamespaces(ctx context.Context, _ *RequestIdentity) ([]corev1.Namespace, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	nsList, err := kc.Client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err == nil {
		kc.Logger.Debug("user can list namespaces cluster-wide", "count", len(nsList.Items))
		return nsList.Items, nil
	}

	if !k8serrors.IsForbidden(err) {
		kc.Logger.Error("failed to list namespaces", "error", err)
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	kc.Logger.Debug("cluster-wide namespace list forbidden, falling back to OpenShift Projects API", "error", err)

	dynClient, err := dynamic.NewForConfig(kc.restConfig)
	if err != nil {
		kc.Logger.Error("failed to create dynamic client for Projects API", "error", err)
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	projectGVR := schema.GroupVersionResource{
		Group:    "project.openshift.io",
		Version:  "v1",
		Resource: "projects",
	}

	projectList, err := dynClient.Resource(projectGVR).List(ctx, metav1.ListOptions{})
	if err != nil {
		kc.Logger.Error("failed to list OpenShift projects", "error", err)
		return nil, fmt.Errorf("failed to list projects: %w", err)
	}

	namespaces := make([]corev1.Namespace, 0, len(projectList.Items))
	for _, project := range projectList.Items {
		projectName := project.GetName()

		ns, err := kc.Client.CoreV1().Namespaces().Get(ctx, projectName, metav1.GetOptions{})
		if err != nil {
			kc.Logger.Warn("failed to get namespace details", "namespace", projectName, "error", err)
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

	kc.Logger.Debug("listed namespaces via OpenShift Projects API", "count", len(namespaces))
	return namespaces, nil
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
		return "", fmt.Errorf("no username found in token")
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

// CanListEvalHubInstances performs a SelfSubjectAccessReview to check whether the user's
// token has permission to list EvalHub CRs in the given namespace.
// The RequestIdentity parameter is unused because the token already represents the user.
func (kc *TokenKubernetesClient) CanListEvalHubInstances(ctx context.Context, _ *RequestIdentity, namespace string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	sar := &authv1.SelfSubjectAccessReview{
		Spec: authv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authv1.ResourceAttributes{
				Verb:      "list",
				Group:     EvalHubCRDGroup,
				Resource:  EvalHubCRDResource,
				Namespace: namespace,
			},
		},
	}

	resp, err := kc.Client.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		kc.Logger.Error("failed to perform EvalHub list SAR", "namespace", namespace, "error", err)
		return false, fmt.Errorf("failed to verify EvalHub list permissions: %w", err)
	}

	return resp.Status.Allowed, nil
}

// GetEvalHubServiceURL lists EvalHub CRs in the given namespace (filtered by the ODH dashboard
// label) and returns the service URL from status.serviceURL of the first found instance.
// The RequestIdentity parameter is unused because the token already represents the user.
func (kc *TokenKubernetesClient) GetEvalHubServiceURL(ctx context.Context, _ *RequestIdentity, namespace string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	dynClient, err := dynamic.NewForConfig(kc.restConfig)
	if err != nil {
		kc.Logger.Error("failed to create dynamic client for EvalHub CR lookup", "error", err)
		return "", fmt.Errorf("failed to create dynamic client: %w", err)
	}

	labelSelector := fmt.Sprintf("%s=true", OpenDataHubDashboardLabel)
	list, err := dynClient.Resource(EvalHubGVR).Namespace(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil {
		kc.Logger.Error("failed to list EvalHub CRs", "namespace", namespace, "error", err)
		return "", fmt.Errorf("failed to list EvalHub CRs in namespace %q: %w", namespace, err)
	}

	if len(list.Items) == 0 {
		return "", fmt.Errorf("no EvalHub instance found in namespace %q", namespace)
	}

	if len(list.Items) > 1 {
		kc.Logger.Warn("multiple EvalHub instances found in namespace, using first",
			"namespace", namespace, "count", len(list.Items))
	}

	item := list.Items[0]
	status, ok := item.Object["status"].(map[string]interface{})
	if !ok {
		return "", fmt.Errorf("EvalHub CR %q in namespace %q has no status field", item.GetName(), namespace)
	}

	serviceURL, ok := status["serviceURL"].(string)
	if !ok || serviceURL == "" {
		return "", fmt.Errorf("EvalHub CR %q in namespace %q has no status.serviceURL", item.GetName(), namespace)
	}

	kc.Logger.Debug("discovered EvalHub service URL from CR",
		"namespace", namespace,
		"crName", item.GetName(),
		"serviceURL", serviceURL)

	return serviceURL, nil
}
