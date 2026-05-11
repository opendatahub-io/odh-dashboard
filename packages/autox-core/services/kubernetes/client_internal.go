package kubernetes

import (
	"context"
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
// All operations require a non-nil RequestIdentity and create impersonated clients
// scoped to the user's permissions. The underlying HTTP transport is shared across
// all impersonated clients for efficient connection pooling.
//
// Security: Identity is mandatory - operations without identity are rejected to prevent
// privilege escalation via service account permissions.
type K8sInternalClient struct {
	RestConfig *rest.Config
}

// K8sInternalClientConfig for injectable constructor (testing)
type K8sInternalClientConfig struct {
	// Minimal config for testing
}

// DefaultK8sInternalClientConfig for default constructor (production)
type DefaultK8sInternalClientConfig struct {
	// Could have additional fields like custom transport settings
}

// NewK8sInternalClient creates an internal client with injectable rest config (for testing).
// All operations use impersonation based on the provided RequestIdentity.
// The restConfig's HTTP transport is shared across all impersonated clients for connection pooling.
func NewK8sInternalClient(cfg K8sInternalClientConfig, restConfig *rest.Config) *K8sInternalClient {
	return &K8sInternalClient{
		RestConfig: restConfig,
	}
}

// NewDefaultK8sInternalClient creates an internal client that uses impersonation for all operations.
// Automatically detects in-cluster (pod service account) vs out-of-cluster (kubeconfig) environments.
//
// The returned client:
//   - Requires non-nil RequestIdentity for all operations (enforces RBAC)
//   - Creates impersonated clients per-request scoped to user permissions
//   - Shares HTTP transport across all impersonated clients (connection pooling)
//   - Needs only "impersonate" permission for the service account (minimal privilege)
//
// Returns an error if Kubernetes configuration cannot be loaded.
func NewDefaultK8sInternalClient(cfg DefaultK8sInternalClientConfig) (*K8sInternalClient, error) {
	// Auto-detect in-cluster vs out-of-cluster config
	clientCfg, err := GetKubernetesConfig()
	if err != nil {
		return nil, err
	}

	return &K8sInternalClient{
		RestConfig: clientCfg,
	}, nil
}

func (c *K8sInternalClient) ListResources(ctx context.Context, identity *RequestIdentity, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
	dynamicClient, err := c.getDynamicClientForIdentity(identity)
	if err != nil {
		return nil, err
	}

	var resourceClient dynamic.ResourceInterface
	if namespace != "" {
		resourceClient = dynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		resourceClient = dynamicClient.Resource(gvr)
	}

	return resourceClient.List(ctx, metav1.ListOptions{})
}

func (c *K8sInternalClient) GetResource(ctx context.Context, identity *RequestIdentity, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error) {
	dynamicClient, err := c.getDynamicClientForIdentity(identity)
	if err != nil {
		return nil, err
	}

	return dynamicClient.Resource(gvr).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (c *K8sInternalClient) CreateResource(ctx context.Context, identity *RequestIdentity, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	dynamicClient, err := c.getDynamicClientForIdentity(identity)
	if err != nil {
		return nil, err
	}

	return dynamicClient.Resource(gvr).Namespace(namespace).Create(ctx, obj, metav1.CreateOptions{})
}

func (c *K8sInternalClient) GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]v1.Namespace, error) {
	clientset, err := c.getClientsetForIdentity(identity)
	if err != nil {
		return nil, err
	}

	nsList, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		if !k8serrors.IsForbidden(err) {
			return nil, err
		}
		// Fall back to OpenShift Projects API when cluster-wide list is forbidden
		return c.getNamespacesViaProjectsAPI(ctx, identity)
	}

	return nsList.Items, nil
}

func (c *K8sInternalClient) GetPods(ctx context.Context, identity *RequestIdentity, namespace string) (*v1.PodList, error) {
	clientset, err := c.getClientsetForIdentity(identity)
	if err != nil {
		return nil, err
	}

	return clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
}

func (c *K8sInternalClient) GetSecrets(ctx context.Context, identity *RequestIdentity, namespace string) ([]v1.Secret, error) {
	clientset, err := c.getClientsetForIdentity(identity)
	if err != nil {
		return nil, err
	}

	secretList, err := clientset.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return secretList.Items, nil
}

func (c *K8sInternalClient) GetSecret(ctx context.Context, identity *RequestIdentity, namespace, secretName string) (*v1.Secret, error) {
	clientset, err := c.getClientsetForIdentity(identity)
	if err != nil {
		return nil, err
	}

	return clientset.CoreV1().Secrets(namespace).Get(ctx, secretName, metav1.GetOptions{})
}

func (c *K8sInternalClient) GetUser(ctx context.Context, identity *RequestIdentity) (string, error) {
	return identity.UserID, nil
}

func (c *K8sInternalClient) IsClusterAdmin(ctx context.Context, identity *RequestIdentity) (bool, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	clientset, err := c.getClientsetForIdentity(identity)
	if err != nil {
		return false, err
	}

	// Check wildcard permissions - the defining characteristic of cluster-admin role
	ssar := &authorizationv1.SelfSubjectAccessReview{
		Spec: authorizationv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authorizationv1.ResourceAttributes{
				Verb:     "*",
				Resource: "*",
			},
		},
	}

	resp, err := clientset.AuthorizationV1().SelfSubjectAccessReviews().Create(timeoutCtx, ssar, metav1.CreateOptions{})
	if err != nil {
		return false, err
	}

	return resp.Status.Allowed, nil
}

func (c *K8sInternalClient) CanAccessResource(ctx context.Context, identity *RequestIdentity, namespace, verb, group, resource, name string) (bool, error) {
	clientset, err := c.getClientsetForIdentity(identity)
	if err != nil {
		return false, err
	}

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

	resp, err := clientset.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, ssar, metav1.CreateOptions{})
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
	identity *RequestIdentity,
	group, resource, namespace string,
	knownVersions []string,
) (schema.GroupVersionResource, error) {
	dynamicClient, err := c.getDynamicClientForIdentity(identity)
	if err != nil {
		return schema.GroupVersionResource{}, err
	}

	for _, version := range knownVersions {
		gvr := schema.GroupVersionResource{
			Group:    group,
			Version:  version,
			Resource: resource,
		}

		// Test with namespace-scoped query (respects RBAC)
		_, err := dynamicClient.Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{Limit: 1})
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

// getDynamicClientForIdentity returns a dynamic client scoped to the given identity via impersonation.
// Identity is REQUIRED - nil is rejected to prevent privilege escalation.
// The underlying HTTP transport is shared for connection pooling efficiency.
func (c *K8sInternalClient) getDynamicClientForIdentity(identity *RequestIdentity) (DynamicClientInterface, error) {
	if identity == nil {
		return nil, &ValidationError{
			Field:   "identity",
			Message: "identity is required - nil identity not allowed for security. All operations must be tied to a user or system identity.",
		}
	}

	userConfig := rest.CopyConfig(c.RestConfig)
	userConfig.Impersonate = rest.ImpersonationConfig{
		UserName: identity.UserID,
		Groups:   append([]string(nil), identity.Groups...),
	}

	// Clear client certificates to prevent credential leakage across user boundaries
	userConfig.CertData = nil
	userConfig.CertFile = ""
	userConfig.KeyData = nil
	userConfig.KeyFile = ""

	return dynamic.NewForConfig(userConfig)
}

// getClientsetForIdentity returns a typed clientset scoped to the given identity via impersonation.
// Identity is REQUIRED - nil is rejected to prevent privilege escalation.
// The underlying HTTP transport is shared for connection pooling efficiency.
func (c *K8sInternalClient) getClientsetForIdentity(identity *RequestIdentity) (ClientsetInterface, error) {
	if identity == nil {
		return nil, &ValidationError{
			Field:   "identity",
			Message: "identity is required - nil identity not allowed for security. All operations must be tied to a user or system identity.",
		}
	}

	userConfig := rest.CopyConfig(c.RestConfig)
	userConfig.Impersonate = rest.ImpersonationConfig{
		UserName: identity.UserID,
		Groups:   append([]string(nil), identity.Groups...),
	}

	// Clear client certificates to prevent credential leakage across user boundaries
	userConfig.CertData = nil
	userConfig.CertFile = ""
	userConfig.KeyData = nil
	userConfig.KeyFile = ""

	return kubernetes.NewForConfig(userConfig)
}

// getNamespacesViaProjectsAPI lists namespaces via OpenShift Projects API when cluster-wide
// namespace listing is forbidden. Falls back to project metadata if namespace details are unavailable.
func (c *K8sInternalClient) getNamespacesViaProjectsAPI(ctx context.Context, identity *RequestIdentity) ([]v1.Namespace, error) {
	dynamicClient, err := c.getDynamicClientForIdentity(identity)
	if err != nil {
		return nil, err
	}

	clientset, err := c.getClientsetForIdentity(identity)
	if err != nil {
		return nil, err
	}

	projectGVR := schema.GroupVersionResource{
		Group:    "project.openshift.io",
		Version:  "v1",
		Resource: "projects",
	}

	projectList, err := dynamicClient.Resource(projectGVR).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	namespaces := make([]v1.Namespace, 0, len(projectList.Items))
	for _, project := range projectList.Items {
		projectName := project.GetName()

		ns, err := clientset.CoreV1().Namespaces().Get(ctx, projectName, metav1.GetOptions{})
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
