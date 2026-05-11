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
	// Get the appropriate dynamic client (impersonated if identity provided, SA otherwise)
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
	// Get the appropriate dynamic client (impersonated if identity provided, SA otherwise)
	dynamicClient, err := c.getDynamicClientForIdentity(identity)
	if err != nil {
		return nil, err
	}

	return dynamicClient.Resource(gvr).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (c *K8sInternalClient) CreateResource(ctx context.Context, identity *RequestIdentity, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	// Get the appropriate dynamic client (impersonated if identity provided, SA otherwise)
	dynamicClient, err := c.getDynamicClientForIdentity(identity)
	if err != nil {
		return nil, err
	}

	return dynamicClient.Resource(gvr).Namespace(namespace).Create(ctx, obj, metav1.CreateOptions{})
}

func (c *K8sInternalClient) GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]v1.Namespace, error) {
	// Get the appropriate clientset (impersonated if identity provided, SA otherwise)
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
	// Get the appropriate clientset (impersonated if identity provided, SA otherwise)
	clientset, err := c.getClientsetForIdentity(identity)
	if err != nil {
		return nil, err
	}

	return clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
}

func (c *K8sInternalClient) GetSecrets(ctx context.Context, identity *RequestIdentity, namespace string) ([]v1.Secret, error) {
	// Get the appropriate clientset (impersonated if identity provided, SA otherwise)
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
	// Get the appropriate clientset (impersonated if identity provided, SA otherwise)
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
	// Create timeout context from parent context to respect cancellation
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Get impersonated clientset for this identity
	clientset, err := c.getClientsetForIdentity(identity)
	if err != nil {
		return false, err
	}

	// Check if user has wildcard permissions on all resources
	// This is the defining characteristic of cluster-admin role
	// Uses SelfSubjectAccessReview - the impersonated user checks their own permissions
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
	// Get impersonated clientset for this identity
	clientset, err := c.getClientsetForIdentity(identity)
	if err != nil {
		return false, err
	}

	// Check if user can perform the requested action
	// Uses SelfSubjectAccessReview - the impersonated user checks their own permissions
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
// Uses impersonated dynamic client to respect user RBAC permissions.
func (c *K8sInternalClient) DiscoverResourceGVR(
	ctx context.Context,
	identity *RequestIdentity,
	group, resource, namespace string,
	knownVersions []string,
) (schema.GroupVersionResource, error) {
	// Get the appropriate dynamic client (impersonated if identity provided, SA otherwise)
	dynamicClient, err := c.getDynamicClientForIdentity(identity)
	if err != nil {
		return schema.GroupVersionResource{}, err
	}

	// Try known versions in preference order
	for _, version := range knownVersions {
		gvr := schema.GroupVersionResource{
			Group:    group,
			Version:  version,
			Resource: resource,
		}

		// Test with namespace-scoped query (respects RBAC)
		_, err := dynamicClient.Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{Limit: 1})
		if err == nil {
			// Successfully accessed the resource with this version
			return gvr, nil
		}

		// Continue trying other versions if NotFound or Forbidden
		if k8serrors.IsNotFound(err) || k8serrors.IsForbidden(err) {
			continue
		}

		// Return unexpected errors immediately
		return schema.GroupVersionResource{}, err
	}

	// No version worked
	return schema.GroupVersionResource{}, &NotFoundError{
		Resource: group + "/" + resource,
		Name:     "no available version found in namespace " + namespace + " (tried: " + strings.Join(knownVersions, ", ") + ")",
	}
}

// ============================================================================
// Private Helper Methods
// ============================================================================

// getDynamicClientForIdentity returns a dynamic client scoped to the given identity.
//
// Security: Identity is REQUIRED - nil identity is rejected to prevent privilege escalation.
// Creates an impersonated client that enforces the user's RBAC permissions.
//
// The underlying HTTP transport from RestConfig is shared across all impersonated clients,
// providing efficient connection pooling without the overhead of creating new transports.
//
// For system operations, create an explicit system identity:
//   systemIdentity := &RequestIdentity{
//       UserID: "system:serviceaccount:namespace:sa-name",
//       Groups: []string{"system:serviceaccounts", ...},
//   }
func (c *K8sInternalClient) getDynamicClientForIdentity(identity *RequestIdentity) (DynamicClientInterface, error) {
	if identity == nil {
		return nil, &ValidationError{
			Field:   "identity",
			Message: "identity is required - nil identity not allowed for security. All operations must be tied to a user or system identity.",
		}
	}

	// Create impersonated config for user RBAC enforcement
	// rest.CopyConfig creates a shallow copy, so the underlying HTTP transport
	// is shared across all clients, providing connection pooling benefits
	userConfig := rest.CopyConfig(c.RestConfig)
	userConfig.Impersonate = rest.ImpersonationConfig{
		UserName: identity.UserID,
		Groups:   append([]string(nil), identity.Groups...), // Copy slice to avoid mutation
	}

	// Clear client certificates to prevent credential leakage across user boundaries
	userConfig.CertData = nil
	userConfig.CertFile = ""
	userConfig.KeyData = nil
	userConfig.KeyFile = ""

	// Create dynamic client with impersonated config
	// This client inherits the shared transport from RestConfig
	return dynamic.NewForConfig(userConfig)
}

// getClientsetForIdentity returns a typed clientset scoped to the given identity.
//
// Security: Identity is REQUIRED - nil identity is rejected to prevent privilege escalation.
// Creates an impersonated clientset that enforces the user's RBAC permissions.
//
// The underlying HTTP transport from RestConfig is shared across all impersonated clients,
// providing efficient connection pooling without the overhead of creating new transports.
//
// For system operations, create an explicit system identity:
//   systemIdentity := &RequestIdentity{
//       UserID: "system:serviceaccount:namespace:sa-name",
//       Groups: []string{"system:serviceaccounts", ...},
//   }
func (c *K8sInternalClient) getClientsetForIdentity(identity *RequestIdentity) (ClientsetInterface, error) {
	if identity == nil {
		return nil, &ValidationError{
			Field:   "identity",
			Message: "identity is required - nil identity not allowed for security. All operations must be tied to a user or system identity.",
		}
	}

	// Create impersonated config for user RBAC enforcement
	// rest.CopyConfig creates a shallow copy, so the underlying HTTP transport
	// is shared across all clients, providing connection pooling benefits
	userConfig := rest.CopyConfig(c.RestConfig)
	userConfig.Impersonate = rest.ImpersonationConfig{
		UserName: identity.UserID,
		Groups:   append([]string(nil), identity.Groups...), // Copy slice to avoid mutation
	}

	// Clear client certificates to prevent credential leakage across user boundaries
	userConfig.CertData = nil
	userConfig.CertFile = ""
	userConfig.KeyData = nil
	userConfig.KeyFile = ""

	// Create clientset with impersonated config
	// This client inherits the shared transport from RestConfig
	return kubernetes.NewForConfig(userConfig)
}

// getNamespacesViaProjectsAPI uses the OpenShift Projects API with impersonation
func (c *K8sInternalClient) getNamespacesViaProjectsAPI(ctx context.Context, identity *RequestIdentity) ([]v1.Namespace, error) {
	// Get impersonated clients for this identity
	// Both clients share the same underlying HTTP transport for connection pooling
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
				// Use project metadata if namespace details unavailable
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
