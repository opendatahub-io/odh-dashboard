package kubernetes

import (
	"context"
	"net/http"
	"strings"
	"time"

	authorizationv1 "k8s.io/api/authorization/v1"
	v1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// K8sInternalClient implements Kubernetes operations using in-cluster service account
// with user impersonation for RBAC enforcement.
//
// Impersonation is handled via a custom RoundTripper that reads RequestIdentity from
// the request context and sets impersonation headers. Clients are created once during
// initialization for efficiency.
//
// Security: Identity is mandatory - operations without identity are rejected to prevent
// privilege escalation via service account permissions.
type K8sInternalClient struct {
	Clientset     ClientsetInterface
	DynamicClient DynamicClientInterface
	RestConfig    *rest.Config
}

// K8sInternalClientConfig for injectable constructor (testing)
type K8sInternalClientConfig struct {
	// Minimal config for testing
}

// DefaultK8sInternalClientConfig for default constructor (production)
type DefaultK8sInternalClientConfig struct {
	// Could have additional fields like custom transport settings
}

// NewK8sInternalClient creates an internal client with injectable clientset and dynamic client (for testing).
func NewK8sInternalClient(cfg K8sInternalClientConfig, clientset ClientsetInterface, dynamicClient DynamicClientInterface, restConfig *rest.Config) *K8sInternalClient {
	return &K8sInternalClient{
		Clientset:     clientset,
		DynamicClient: dynamicClient,
		RestConfig:    restConfig,
	}
}

// NewDefaultK8sInternalClient creates an internal client that uses impersonation for all operations.
// Automatically detects in-cluster (pod service account) vs out-of-cluster (kubeconfig) environments.
//
// The returned client:
//   - Requires RequestIdentity in context for all operations (enforces RBAC)
//   - Uses a custom RoundTripper to inject impersonation headers from context
//   - Creates clients once at initialization (efficient)
//   - Needs only "impersonate" permission for the service account (minimal privilege)
//
// Returns an error if Kubernetes configuration cannot be loaded or clients cannot be created.
func NewDefaultK8sInternalClient(cfg DefaultK8sInternalClientConfig) (*K8sInternalClient, error) {
	// Auto-detect in-cluster vs out-of-cluster config
	baseConfig, err := GetKubernetesConfig()
	if err != nil {
		return nil, err
	}

	// Wrap transport to inject impersonation headers from context
	clientCfg := rest.CopyConfig(baseConfig)
	clientCfg.WrapTransport = func(rt http.RoundTripper) http.RoundTripper {
		return &impersonationRoundTripper{
			base: rt,
		}
	}

	clientset, err := kubernetes.NewForConfig(clientCfg)
	if err != nil {
		return nil, err
	}

	dynamicClient, err := dynamic.NewForConfig(clientCfg)
	if err != nil {
		return nil, err
	}

	return &K8sInternalClient{
		Clientset:     clientset,
		DynamicClient: dynamicClient,
		RestConfig:    clientCfg,
	}, nil
}

func (c *K8sInternalClient) ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
	var resourceClient dynamic.ResourceInterface
	if namespace != "" {
		resourceClient = c.DynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		resourceClient = c.DynamicClient.Resource(gvr)
	}

	return resourceClient.List(ctx, metav1.ListOptions{})
}

func (c *K8sInternalClient) GetResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error) {
	return c.DynamicClient.Resource(gvr).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (c *K8sInternalClient) CreateResource(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	return c.DynamicClient.Resource(gvr).Namespace(namespace).Create(ctx, obj, metav1.CreateOptions{})
}

func (c *K8sInternalClient) GetNamespaces(ctx context.Context) ([]v1.Namespace, error) {
	nsList, err := c.Clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		if !k8serrors.IsForbidden(err) {
			return nil, err
		}
		// Fall back to OpenShift Projects API when cluster-wide list is forbidden
		return c.getNamespacesViaProjectsAPI(ctx)
	}

	return nsList.Items, nil
}

func (c *K8sInternalClient) GetPods(ctx context.Context, namespace string) (*v1.PodList, error) {
	return c.Clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
}

func (c *K8sInternalClient) GetSecrets(ctx context.Context, namespace string) ([]v1.Secret, error) {
	secretList, err := c.Clientset.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return secretList.Items, nil
}

func (c *K8sInternalClient) GetSecret(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
	return c.Clientset.CoreV1().Secrets(namespace).Get(ctx, secretName, metav1.GetOptions{})
}

func (c *K8sInternalClient) GetUser(ctx context.Context) (string, error) {
	identity, err := IdentityFromContext(ctx)
	if err != nil {
		return "", err
	}

	return identity.UserID, nil
}

func (c *K8sInternalClient) IsClusterAdmin(ctx context.Context) (bool, error) {
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

func (c *K8sInternalClient) CanAccessResource(ctx context.Context, namespace, verb, group, resource, name string) (bool, error) {
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

	resp, err := c.Clientset.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, ssar, metav1.CreateOptions{})
	if err != nil {
		return false, err
	}

	return resp.Status.Allowed, nil
}

// DiscoverResourceGVR discovers the preferred API version for a custom resource
// by trying known versions in preference order (newer to older).
// Returns the first working GroupVersionResource or an error if none are available.
func (c *K8sInternalClient) DiscoverResourceGVR(
	ctx context.Context,
	group, resource, namespace string,
	knownVersions []string,
) (schema.GroupVersionResource, error) {
	for _, version := range knownVersions {
		gvr := schema.GroupVersionResource{
			Group:    group,
			Version:  version,
			Resource: resource,
		}

		// Test with namespace-scoped query (respects RBAC)
		_, err := c.DynamicClient.Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{Limit: 1})
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
func (c *K8sInternalClient) getNamespacesViaProjectsAPI(ctx context.Context) ([]v1.Namespace, error) {
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

// impersonationRoundTripper injects impersonation headers from the RequestIdentity in context.
// This allows a single client to handle requests for multiple users efficiently.
type impersonationRoundTripper struct {
	base http.RoundTripper
}

func (t *impersonationRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	identity, err := IdentityFromContext(req.Context())
	if err != nil {
		return nil, err
	}

	if identity.UserID == "" {
		return nil, &ValidationError{
			Field:   "identity.UserID",
			Message: "identity UserID is required for impersonation",
		}
	}

	// Clone the request to avoid modifying the original (required by http.RoundTripper contract)
	req2 := req.Clone(req.Context())

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
