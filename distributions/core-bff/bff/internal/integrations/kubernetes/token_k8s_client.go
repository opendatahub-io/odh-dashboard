package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/helpers"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	authnv1 "k8s.io/api/authentication/v1"
	authv1 "k8s.io/api/authorization/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// TokenKubernetesClient implements KubernetesClientInterface using a user bearer token.
type TokenKubernetesClient struct {
	SharedClientLogic
}

func (kc *TokenKubernetesClient) IsClusterAdmin(ctx context.Context, _ *RequestIdentity) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
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
		httpcontract.LogContext(kc.Logger, ctx).Error("failed to perform cluster-admin SAR", "code", httpcontract.SafeErrorCode(err))
		return false, fmt.Errorf("failed to verify cluster-admin permissions: %w", err)
	}

	if resp.Status.EvaluationError != "" {
		httpcontract.LogContext(kc.Logger, ctx).Debug("access review completed with diagnostic", "allowed", resp.Status.Allowed)
	}
	if !resp.Status.Allowed {
		httpcontract.LogContext(kc.Logger, ctx).Info("user is NOT cluster-admin")
		return false, nil
	}

	return true, nil
}

// NewKubeconfigKubernetesClient creates a Kubernetes client using the kubeconfig's native auth
func NewKubeconfigKubernetesClient(ctx context.Context, logger *slog.Logger) (KubernetesClientInterface, error) {
	cfg, err := helpers.GetKubeconfig()
	if err != nil {
		httpcontract.LogContext(logger, ctx).Error("failed to get kubeconfig", "code", httpcontract.SafeErrorCode(err))
		return nil, fmt.Errorf("failed to get kubeconfig: %w", err)
	}

	cfg.Wrap(httpcontract.WrapTransport)
	clientset, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		httpcontract.LogContext(logger, ctx).Error("failed to create kubeconfig-based Kubernetes client", "code", httpcontract.SafeErrorCode(err))
		return nil, fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	return &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client:     clientset,
			Logger:     logger,
			RestConfig: cfg,
			Token:      NewBearerToken(""),
		},
	}, nil
}

// NewTokenKubernetesClient creates a Kubernetes client using a user bearer token.
func NewTokenKubernetesClient(ctx context.Context, token string, logger *slog.Logger) (KubernetesClientInterface, error) {
	baseConfig, err := helpers.GetKubeconfig()
	if err != nil {
		httpcontract.LogContext(logger, ctx).Error("failed to get kubeconfig", "code", httpcontract.SafeErrorCode(err))
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

	cfg.Wrap(httpcontract.WrapTransport)
	clientset, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		httpcontract.LogContext(logger, ctx).Error("failed to create token-based Kubernetes client", "code", httpcontract.SafeErrorCode(err))
		return nil, fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	return &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client:     clientset,
			Logger:     logger,
			RestConfig: cfg,
			// Token is retained for follow-up calls; do not log it.
			Token: NewBearerToken(token),
		},
	}, nil
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
			httpcontract.LogContext(kc.Logger, ctx).Error("self-SAR failed", "namespace", namespace, "verb", verb, "code", httpcontract.SafeErrorCode(err))
			return false, err
		}

		if resp.Status.EvaluationError != "" {
			httpcontract.LogContext(kc.Logger, ctx).Debug("access review completed with diagnostic", "allowed", resp.Status.Allowed)
		}
		if !resp.Status.Allowed {
			httpcontract.LogContext(kc.Logger, ctx).Warn("self-SAR denied", "namespace", namespace, "verb", verb)
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
		httpcontract.LogContext(kc.Logger, ctx).Error("self-SAR failed", "service", serviceName, "namespace", namespace, "code", httpcontract.SafeErrorCode(err))
		return false, err
	}
	if resp.Status.EvaluationError != "" {
		httpcontract.LogContext(kc.Logger, ctx).Debug("access review completed with diagnostic", "allowed", resp.Status.Allowed)
	}
	if !resp.Status.Allowed {
		httpcontract.LogContext(kc.Logger, ctx).Warn("self-SAR denied", "service", serviceName, "namespace", namespace)
		return false, nil
	}

	return true, nil
}

// RequestIdentity is unused because the token already represents the user identity.
// This endpoint is used only in dev mode. Permission failures are expected there,
// so they are logged at Warn, but the request still returns an error to the caller.
func (kc *TokenKubernetesClient) GetNamespaces(ctx context.Context, _ *RequestIdentity) ([]corev1.Namespace, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	nsList, err := kc.Client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		httpcontract.LogContext(kc.Logger, ctx).Warn("user is not allowed to list namespaces or failed to list namespaces")
		return []corev1.Namespace{}, fmt.Errorf("failed to list namespaces: %w", err)
	}

	return nsList.Items, nil
}

// CanGetNamespace asks the API server about the caller's cluster-scoped, named get permission.
func (kc *TokenKubernetesClient) CanGetNamespace(ctx context.Context, _ *RequestIdentity, name string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	ssar := &authv1.SelfSubjectAccessReview{
		Spec: authv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authv1.ResourceAttributes{
				Verb:     "get",
				Resource: "namespaces",
				Name:     name,
			},
		},
	}
	resp, err := kc.Client.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, ssar, metav1.CreateOptions{})
	if err != nil {
		return false, fmt.Errorf("failed to check namespace get access: %w", err)
	}
	if resp.Status.EvaluationError != "" {
		httpcontract.LogContext(kc.Logger, ctx).Debug("access review completed with diagnostic", "allowed", resp.Status.Allowed)
	}
	return resp.Status.Allowed, nil
}

func (kc *TokenKubernetesClient) GetNamespace(ctx context.Context, _ *RequestIdentity, name string) (*corev1.Namespace, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	return kc.Client.CoreV1().Namespaces().Get(ctx, name, metav1.GetOptions{})
}

func (kc *TokenKubernetesClient) GetUser(ctx context.Context, _ *RequestIdentity) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	ssr := &authnv1.SelfSubjectReview{
		TypeMeta: metav1.TypeMeta{
			Kind:       "SelfSubjectReview",
			APIVersion: "authentication.k8s.io/v1",
		},
	}

	resp, err := kc.Client.AuthenticationV1().SelfSubjectReviews().Create(ctx, ssr, metav1.CreateOptions{})
	if err != nil {
		httpcontract.LogContext(kc.Logger, ctx).Error("failed to get user identity from token", "code", httpcontract.SafeErrorCode(err))
		return "", fmt.Errorf("failed to get user identity: %w", err)
	}

	username := resp.Status.UserInfo.Username
	if username == "" {
		httpcontract.LogContext(kc.Logger, ctx).Warn("user identity unresolved", "code", "IDENTITY_UNRESOLVED")
		return "", fmt.Errorf("no username found in SelfSubjectReview: %w", httpcontract.ErrIdentityUnresolved)
	}

	// If it's a service account, extract the SA name
	const saPrefix = "system:serviceaccount:"
	if strings.HasPrefix(username, saPrefix) {
		parts := strings.SplitN(strings.TrimPrefix(username, saPrefix), ":", 2)
		if len(parts) == 2 {
			return parts[1], nil // Return just the service account name
		}
		httpcontract.LogContext(kc.Logger, ctx).Warn("malformed service account username", "username", username)
	}

	return username, nil
}

// IsUserAdmin checks if the user can patch the auths/auth singleton
// (services.platform.opendatahub.io). This is NOT generic cluster-admin detection -
// it checks SSAR for "patch" on "auths/auth" specifically.
// Parity: mirrors Fastify's adminUtils.ts isUserAdmin(), which performs the same
// SSAR check against auths/auth to determine dashboard admin status.
// See also: IsClusterAdmin() for the generic wildcard SSAR check.
func (kc *TokenKubernetesClient) IsUserAdmin(ctx context.Context, _ *RequestIdentity) (bool, error) {
	return kc.checkAuthSingletonAccess(ctx, "patch")
}

// IsUserAllowed checks if the user can get the auths/auth singleton,
func (kc *TokenKubernetesClient) IsUserAllowed(ctx context.Context, _ *RequestIdentity) (bool, error) {
	return kc.checkAuthSingletonAccess(ctx, "get")
}

func (kc *TokenKubernetesClient) checkAuthSingletonAccess(ctx context.Context, verb string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Name must be the same constant used to read the CR (see repositories.AuthRepository.GetAuth).
	// The CRD pins the singleton to "auth" via a CEL rule, so any other name would authorize
	// against a resource that cannot exist - silently denying every admin once the granting
	// ClusterRole is scoped with resourceNames.
	sar := &authv1.SelfSubjectAccessReview{
		Spec: authv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authv1.ResourceAttributes{
				Group:    models.AuthGVR.Group,
				Resource: models.AuthGVR.Resource,
				Name:     models.AuthInstanceName,
				Verb:     verb,
			},
		},
	}

	resp, err := kc.Client.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		return false, fmt.Errorf("failed to perform auth singleton SAR (verb=%s): %w", verb, err)
	}

	if resp.Status.EvaluationError != "" {
		httpcontract.LogContext(kc.Logger, ctx).Debug("access review completed with diagnostic", "allowed", resp.Status.Allowed)
	}
	return resp.Status.Allowed, nil
}

func (kc *TokenKubernetesClient) CheckAccess(ctx context.Context, _ *RequestIdentity, verb, group, resource, namespace string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	sar := &authv1.SelfSubjectAccessReview{
		Spec: authv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authv1.ResourceAttributes{
				Verb:      verb,
				Group:     group,
				Resource:  resource,
				Namespace: namespace,
			},
		},
	}

	resp, err := kc.Client.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		httpcontract.LogContext(kc.Logger, ctx).Error("SSAR check failed", "verb", verb, "group", group, "resource", resource, "namespace", namespace, "code", httpcontract.SafeErrorCode(err))
		return false, fmt.Errorf("failed to check access (verb=%s, resource=%s/%s): %w", verb, group, resource, err)
	}

	if resp.Status.EvaluationError != "" {
		httpcontract.LogContext(kc.Logger, ctx).Debug("access review completed with diagnostic", "allowed", resp.Status.Allowed)
	}
	if !resp.Status.Allowed {
		httpcontract.LogContext(kc.Logger, ctx).Info("SSAR denied", "verb", verb, "group", group, "resource", resource, "namespace", namespace)
	}
	return resp.Status.Allowed, nil
}

func (kc *TokenKubernetesClient) GetConfigMap(ctx context.Context, namespace, name string) (*corev1.ConfigMap, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	return kc.Client.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (kc *TokenKubernetesClient) ListConfigMaps(ctx context.Context, namespace string, labelSelector string) (*corev1.ConfigMapList, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	return kc.Client.CoreV1().ConfigMaps(namespace).List(ctx, metav1.ListOptions{LabelSelector: labelSelector})
}

func (kc *TokenKubernetesClient) CreateConfigMap(ctx context.Context, namespace string, cm *corev1.ConfigMap) (*corev1.ConfigMap, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	return kc.Client.CoreV1().ConfigMaps(namespace).Create(ctx, cm, metav1.CreateOptions{})
}

func (kc *TokenKubernetesClient) UpdateConfigMap(ctx context.Context, namespace string, cm *corev1.ConfigMap) (*corev1.ConfigMap, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	return kc.Client.CoreV1().ConfigMaps(namespace).Update(ctx, cm, metav1.UpdateOptions{})
}

func (kc *TokenKubernetesClient) PatchConfigMap(ctx context.Context, namespace, name string, patchData []byte, patchType types.PatchType) (*corev1.ConfigMap, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	return kc.Client.CoreV1().ConfigMaps(namespace).Patch(ctx, name, patchType, patchData, metav1.PatchOptions{})
}

func (kc *TokenKubernetesClient) DeleteConfigMap(ctx context.Context, namespace, name string) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	return kc.Client.CoreV1().ConfigMaps(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}
