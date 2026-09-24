package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	helper "github.com/opendatahub-io/data-registry/bff/internal/helpers"
	authv1 "k8s.io/api/authorization/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type InternalKubernetesClient struct {
	SharedClientLogic
}

// newInternalKubernetesClient creates a Kubernetes client
// using the credentials of the running backend to create a single instance of the client
// If running inside the cluster, it uses the pod's service account.
// If running locally (e.g. for development), it uses the current user's kubeconfig context.
// Every request is impersonated as the authenticated user from RequestIdentity.
func newInternalKubernetesClient(logger *slog.Logger) (KubernetesClientInterface, error) {
	// Get kubeconfig
	kubeconfig, err := helper.GetKubeconfig()
	if err != nil {
		logger.Error("failed to get kubeconfig", "error", err)
		return nil, fmt.Errorf("failed to get kubeconfig: %w", err)
	}

	clientConfig := rest.CopyConfig(kubeconfig)
	clientConfig.WrapTransport = func(roundTripper http.RoundTripper) http.RoundTripper {
		return &impersonationRoundTripper{base: roundTripper}
	}

	clientset, err := kubernetes.NewForConfig(clientConfig)
	if err != nil {
		logger.Error("failed to create Kubernetes client", "error", err)
		return nil, fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	dynamicClient, err := dynamic.NewForConfig(clientConfig)
	if err != nil {
		logger.Error("failed to create dynamic Kubernetes client", "error", err)
		return nil, fmt.Errorf("failed to create dynamic Kubernetes client: %w", err)
	}

	return &InternalKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client:        clientset,
			DynamicClient: dynamicClient,
			Logger:        logger,
			Token:         NewBearerToken(kubeconfig.BearerToken),
		},
	}, nil
}

// Removed service discovery and service-level access checks for starter template.

func (kc *InternalKubernetesClient) GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error) {
	if identity == nil || identity.UserID == "" {
		return nil, fmt.Errorf("missing user identity for Kubernetes impersonation")
	}

	return kc.listNamespaces(ContextWithIdentity(ctx, identity))
}

func (kc *InternalKubernetesClient) IsClusterAdmin(identity *RequestIdentity) (bool, error) {
	if identity == nil || identity.UserID == "" {
		return false, fmt.Errorf("missing user identity for Kubernetes impersonation")
	}

	ctx, cancel := context.WithTimeout(ContextWithIdentity(context.Background(), identity), 10*time.Second)
	defer cancel()

	sar := &authv1.SelfSubjectAccessReview{
		Spec: authv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authv1.ResourceAttributes{
				Verb:     "*",
				Resource: "*",
			},
		},
	}

	response, err := kc.Client.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		kc.Logger.Error("failed to perform cluster-admin access review", "error", err)
		return false, fmt.Errorf("failed to verify cluster-admin permissions: %w", err)
	}

	return response.Status.Allowed, nil
}

func (kc *InternalKubernetesClient) GetUser(identity *RequestIdentity) (string, error) {
	// On internal client, we can use the identity from request directly
	return identity.UserID, nil
}

// impersonationRoundTripper injects the authenticated request identity into
// every Kubernetes request made by the internal client. The underlying client
// credentials identify the BFF service account; these headers make Kubernetes
// evaluate the request using the caller's RBAC permissions.
type impersonationRoundTripper struct {
	base http.RoundTripper
}

func (t *impersonationRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	identity, err := identityFromContext(req.Context())
	if err != nil {
		return nil, err
	}
	if identity.UserID == "" {
		return nil, fmt.Errorf("user identity is required for Kubernetes impersonation")
	}

	request := req.Clone(req.Context())
	request.Header.Set("Impersonate-User", identity.UserID)
	// Group impersonation is deliberately disabled for Data Registry. The BFF does not have an
	// independently authenticated group source, so forwarding request-provided groups would turn
	// the internal compatibility mode into a privilege-escalation boundary.
	request.Header.Del("Impersonate-Group")
	request.Header.Del("Impersonate-Uid")

	return t.base.RoundTrip(request)
}
