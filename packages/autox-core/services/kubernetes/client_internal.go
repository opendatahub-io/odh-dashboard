package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	authorizationv1 "k8s.io/api/authorization/v1"
	v1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// internalClient implements Kubernetes operations using in-cluster service account
// with user impersonation for RBAC enforcement.
//
// Impersonation is handled via a custom RoundTripper that reads RequestIdentity from
// the request context and sets impersonation headers. Clients are created once during
// initialization for efficiency.
//
// Security: Identity is mandatory - operations without identity are rejected to prevent
// privilege escalation via service account permissions.
type internalClient struct {
	Clientset     Clientset
	DynamicClient DynamicClient
}

// NewInternalClient creates an internal client with injectable Clientset and DynamicClient (for testing).
func NewInternalClient(cs Clientset, dc DynamicClient) Client {
	return &internalClient{
		Clientset:     cs,
		DynamicClient: dc,
	}
}

// NewDefaultInternalClient creates an internal client that uses impersonation for all operations.
// Automatically detects in-cluster (pod service account) vs out-of-cluster (kubeconfig) environments.
//
// The returned client:
//   - Requires RequestIdentity in context for all operations (enforces RBAC)
//   - Uses a custom RoundTripper to inject impersonation headers from context
//   - Creates clients once at initialization (efficient)
//   - Needs only "impersonate" permission for the service account (minimal privilege)
//
// Returns an error if Kubernetes configuration cannot be loaded or clients cannot be created.
func NewDefaultInternalClient() (Client, error) {
	baseConfig, err := getKubernetesConfig()
	if err != nil {
		return nil, err
	}

	clientCfg := rest.CopyConfig(baseConfig)
	clientCfg.WrapTransport = func(rt http.RoundTripper) http.RoundTripper {
		return &impersonationRoundTripper{base: rt}
	}

	cs, err := kubernetes.NewForConfig(clientCfg)
	if err != nil {
		return nil, err
	}

	dc, err := dynamic.NewForConfig(clientCfg)
	if err != nil {
		return nil, err
	}

	return &internalClient{
		Clientset:     cs,
		DynamicClient: dc,
	}, nil
}

func (c *internalClient) ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	var resourceClient dynamic.ResourceInterface
	if namespace != "" {
		resourceClient = c.DynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		resourceClient = c.DynamicClient.Resource(gvr)
	}

	return resourceClient.List(timeoutCtx, metav1.ListOptions{})
}

func (c *internalClient) GetResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	return c.DynamicClient.Resource(gvr).Namespace(namespace).Get(timeoutCtx, name, metav1.GetOptions{})
}

func (c *internalClient) CreateResource(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	return c.DynamicClient.Resource(gvr).Namespace(namespace).Create(timeoutCtx, obj, metav1.CreateOptions{})
}

func (c *internalClient) PatchResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string, patchType types.PatchType, patchData []byte) (*unstructured.Unstructured, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	return c.DynamicClient.Resource(gvr).Namespace(namespace).Patch(timeoutCtx, name, patchType, patchData, metav1.PatchOptions{})
}

func (c *internalClient) PatchDeployment(ctx context.Context, namespace, name string, patchType types.PatchType, patchData []byte) error {
	timeoutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	_, err := c.Clientset.AppsV1().Deployments(namespace).Patch(timeoutCtx, name, patchType, patchData, metav1.PatchOptions{})
	return err
}

func (c *internalClient) GetNamespaces(ctx context.Context) ([]v1.Namespace, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	nsList, err := c.Clientset.CoreV1().Namespaces().List(timeoutCtx, metav1.ListOptions{})
	if err != nil {
		if !k8serrors.IsForbidden(err) {
			return nil, err
		}
		// Fall back to OpenShift Projects API when cluster-wide list is forbidden
		return c.getNamespacesViaProjectsAPI(timeoutCtx)
	}

	return nsList.Items, nil
}

func (c *internalClient) GetPods(ctx context.Context, namespace string) (*v1.PodList, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	return c.Clientset.CoreV1().Pods(namespace).List(timeoutCtx, metav1.ListOptions{})
}

func (c *internalClient) GetSecrets(ctx context.Context, namespace string) ([]v1.Secret, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	secretList, err := c.Clientset.CoreV1().Secrets(namespace).List(timeoutCtx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return secretList.Items, nil
}

func (c *internalClient) GetSecret(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	return c.Clientset.CoreV1().Secrets(namespace).Get(timeoutCtx, secretName, metav1.GetOptions{})
}

func (c *internalClient) GetUser(ctx context.Context) (string, error) {
	identity, err := IdentityFromContext(ctx)
	if err != nil {
		return "", err
	}

	return identity.UserID, nil
}

func (c *internalClient) IsClusterAdmin(ctx context.Context) (bool, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Check wildcard permissions - the defining characteristic of cluster-admin role
	ssar := &authorizationv1.SelfSubjectAccessReview{
		Spec: authorizationv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authorizationv1.ResourceAttributes{
				Verb:     "*",
				Resource: "*",
			},
		},
	}

	resp, err := c.Clientset.AuthorizationV1().SelfSubjectAccessReviews().Create(timeoutCtx, ssar, metav1.CreateOptions{})
	if err != nil {
		return false, err
	}

	return resp.Status.Allowed, nil
}

func (c *internalClient) CanAccessResource(ctx context.Context, namespace, verb, group, resource, name string) (bool, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	ssar := &authorizationv1.SelfSubjectAccessReview{
		Spec: authorizationv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authorizationv1.ResourceAttributes{
				Verb:      verb,
				Group:     group,
				Resource:  resource,
				Namespace: namespace,
				Name:      name,
			},
		},
	}

	resp, err := c.Clientset.AuthorizationV1().SelfSubjectAccessReviews().Create(timeoutCtx, ssar, metav1.CreateOptions{})
	if err != nil {
		return false, err
	}

	return resp.Status.Allowed, nil
}

// DiscoverResourceGVR discovers the preferred API version for a custom resource
// by trying known versions in preference order (newer to older).
// Returns the first working GroupVersionResource or an error if none are available.
func (c *internalClient) DiscoverResourceGVR(
	ctx context.Context,
	group, resource, namespace string,
	knownVersions []string,
) (schema.GroupVersionResource, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	for _, version := range knownVersions {
		gvr := schema.GroupVersionResource{
			Group:    group,
			Version:  version,
			Resource: resource,
		}

		// Probe with a minimal namespace-scoped list (Limit: 1) to check if
		// this API version exists. 404 = version doesn't exist on this cluster,
		// 403 = exists but user lacks access — both mean try the next version.
		_, err := c.DynamicClient.Resource(gvr).Namespace(namespace).List(timeoutCtx, metav1.ListOptions{Limit: 1})
		if err == nil {
			return gvr, nil
		}

		if k8serrors.IsNotFound(err) || k8serrors.IsForbidden(err) {
			continue
		}

		return schema.GroupVersionResource{}, err
	}

	return schema.GroupVersionResource{}, &NotFoundError{
		Resource: group + "/" + resource,
		Name:     "no available version found in namespace " + namespace + " (tried: " + strings.Join(knownVersions, ", ") + ")",
	}
}

// ============================================================================
// Private Helper Methods
// ============================================================================

// getNamespacesViaProjectsAPI lists namespaces via OpenShift Projects API when cluster-wide
// namespace listing is forbidden. Falls back to project metadata if namespace details are unavailable.
// This method expects the caller to have already set an appropriate timeout on the context.
func (c *internalClient) getNamespacesViaProjectsAPI(ctx context.Context) ([]v1.Namespace, error) {
	projectGVR := schema.GroupVersionResource{
		Group:    "project.openshift.io",
		Version:  "v1",
		Resource: "projects",
	}

	projectList, err := c.DynamicClient.Resource(projectGVR).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	namespaces := make([]v1.Namespace, 0, len(projectList.Items))
	for _, project := range projectList.Items {
		projectName := project.GetName()

		ns, err := c.Clientset.CoreV1().Namespaces().Get(ctx, projectName, metav1.GetOptions{})
		if err != nil {
			if k8serrors.IsForbidden(err) || k8serrors.IsNotFound(err) {
				namespaces = append(namespaces, v1.Namespace{
					ObjectMeta: metav1.ObjectMeta{
						Name:        projectName,
						Annotations: project.GetAnnotations(),
						Labels:      project.GetLabels(),
					},
				})
			} else {
				return nil, err
			}
		} else {
			namespaces = append(namespaces, *ns)
		}
	}

	return namespaces, nil
}

// NewSATokenTransportWrapper returns a WrapTransport function that injects the pod's
// service account token into every outbound request. Intended for internal auth mode,
// where there is no per-request user token — the BFF authenticates to downstream
// services (e.g. kube-rbac-proxy in front of model registry) using its own SA credentials.
//
// Token rotation is handled automatically: when running in-cluster the token file is
// re-read on each request so that short-lived projected tokens stay current.
// In local development (kubeconfig), the static token from the kubeconfig is used.
//
// Returns an error at startup if the Kubernetes config cannot be loaded, so misconfiguration
// is caught before serving any requests.
func NewSATokenTransportWrapper() (func(http.RoundTripper) http.RoundTripper, error) {
	cfg, err := getKubernetesConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load kubernetes config for SA token transport: %w", err)
	}
	return func(base http.RoundTripper) http.RoundTripper {
		return &saTokenRoundTripper{
			base:      base,
			token:     cfg.BearerToken,
			tokenFile: cfg.BearerTokenFile,
		}
	}, nil
}

// saTokenRoundTripper injects the pod's service account token into outbound requests.
// It re-reads the token file on each request to handle short-lived projected token rotation.
type saTokenRoundTripper struct {
	base      http.RoundTripper
	token     string // static token (local dev / kubeconfig)
	tokenFile string // projected token file path (in-cluster, rotated by kubelet)
}

func (t *saTokenRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	token := t.token
	if t.tokenFile != "" {
		if data, err := os.ReadFile(t.tokenFile); err == nil {
			if s := strings.TrimSpace(string(data)); s != "" {
				token = s
			}
		}
	}
	if token == "" {
		return nil, errors.New("service account token is empty")
	}
	req2 := req.Clone(req.Context())
	req2.Header.Set("Authorization", "Bearer "+token)
	return t.base.RoundTrip(req2)
}

// impersonationRoundTripper injects impersonation headers from the RequestIdentity in context.
// This allows a single client to handle requests for multiple users efficiently.
type impersonationRoundTripper struct {
	base http.RoundTripper
}

func (t *impersonationRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	ctx := req.Context()
	identity, err := IdentityFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if identity.UserID == "" {
		return nil, &ValidationError{
			Field:   "identity.UserID",
			Message: "identity UserID is required for impersonation",
		}
	}

	req2 := req.Clone(ctx)

	// Set impersonation headers on the cloned request
	req2.Header.Set("Impersonate-User", identity.UserID)
	req2.Header.Del("Impersonate-Group")
	req2.Header.Del("Impersonate-Uid")

	// Clear any existing group headers
	req2.Header.Del("Impersonate-Group")

	// Add group headers
	for _, group := range identity.Groups {
		req2.Header.Add("Impersonate-Group", group)
	}

	return t.base.RoundTrip(req2)
}

// Compile-time interface check.
var _ Client = (*internalClient)(nil)
