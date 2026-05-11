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

// NewK8sInternalClient creates an internal client with injectable clientset and dynamic client (for testing)
func NewK8sInternalClient(cfg K8sInternalClientConfig, clientset ClientsetInterface, dynamicClient DynamicClientInterface, restConfig *rest.Config) *K8sInternalClient {
	return &K8sInternalClient{
		Clientset:     clientset,
		DynamicClient: dynamicClient,
		RestConfig:    restConfig,
	}
}

// NewDefaultK8sInternalClient creates an internal client with real Kubernetes clientset and dynamic client.
// Automatically detects in-cluster (pod service account) vs out-of-cluster (kubeconfig) environments.
// Returns an error if Kubernetes configuration cannot be loaded or clients cannot be created.
func NewDefaultK8sInternalClient(cfg DefaultK8sInternalClientConfig) (*K8sInternalClient, error) {
	// Auto-detect in-cluster vs out-of-cluster config
	clientCfg, err := GetKubernetesConfig()
	if err != nil {
		return nil, err
	}

	clientset, err := kubernetes.NewForConfig(clientCfg)
	if err != nil {
		return nil, err
	}

	// Create dynamic client with the same config
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

// getDynamicClientForIdentity returns a dynamic client scoped to the given identity.
//
// Identity behavior:
//   - If identity is nil: Returns service account client (elevated permissions)
//     WARNING: Only use nil for internal system operations, never for user-facing requests
//   - If identity is non-nil: Creates impersonated client enforcing user's RBAC permissions
//
// Security: Always pass identity from request context for user-initiated operations.
// The service account has elevated cluster permissions and bypasses RBAC checks.
func (c *K8sInternalClient) getDynamicClientForIdentity(identity *RequestIdentity) (DynamicClientInterface, error) {
	if identity == nil {
		// No identity provided - use service account permissions
		// This should only happen for internal system operations
		return c.DynamicClient, nil
	}

	// Create impersonated config for user RBAC
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
	return dynamic.NewForConfig(userConfig)
}

// getClientsetForIdentity returns a typed clientset scoped to the given identity.
//
// Identity behavior:
//   - If identity is nil: Returns service account clientset (elevated permissions)
//     WARNING: Only use nil for internal system operations, never for user-facing requests
//   - If identity is non-nil: Creates impersonated clientset enforcing user's RBAC permissions
//
// Security: Always pass identity from request context for user-initiated operations.
// The service account has elevated cluster permissions and bypasses RBAC checks.
func (c *K8sInternalClient) getClientsetForIdentity(identity *RequestIdentity) (ClientsetInterface, error) {
	if identity == nil {
		// No identity provided - use service account permissions
		// This should only happen for internal system operations
		return c.Clientset, nil
	}

	// Create impersonated config for user RBAC
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
	return kubernetes.NewForConfig(userConfig)
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

	// Check if user has wildcard permissions on all resources
	// This is the defining characteristic of cluster-admin role
	// Uses SubjectAccessReview with user's identity, not SA permissions
	sar := &authorizationv1.SubjectAccessReview{
		Spec: authorizationv1.SubjectAccessReviewSpec{
			User:   identity.UserID,
			Groups: identity.Groups,
			ResourceAttributes: &authorizationv1.ResourceAttributes{
				Verb:     "*",
				Resource: "*",
			},
		},
	}

	resp, err := c.Clientset.AuthorizationV1().SubjectAccessReviews().Create(timeoutCtx, sar, metav1.CreateOptions{})
	if err != nil {
		return false, err
	}

	return resp.Status.Allowed, nil
}

func (c *K8sInternalClient) CanAccessResource(ctx context.Context, identity *RequestIdentity, namespace, verb, group, resource, name string) (bool, error) {
	sar := &authorizationv1.SubjectAccessReview{
		Spec: authorizationv1.SubjectAccessReviewSpec{
			User:   identity.UserID,
			Groups: identity.Groups,
			ResourceAttributes: &authorizationv1.ResourceAttributes{
				Verb:      verb,
				Group:     group,
				Resource:  resource,
				Namespace: namespace,
				Name:      name,
			},
		},
	}

	resp, err := c.Clientset.AuthorizationV1().SubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
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

// getNamespacesViaProjectsAPI uses the OpenShift Projects API with impersonation
func (c *K8sInternalClient) getNamespacesViaProjectsAPI(ctx context.Context, identity *RequestIdentity) ([]v1.Namespace, error) {
	// Create impersonated config
	impersonatedConfig := rest.CopyConfig(c.RestConfig)
	impersonatedConfig.Impersonate = rest.ImpersonationConfig{
		UserName: identity.UserID,
		Groups:   append([]string(nil), identity.Groups...),
	}

	dynClient, err := dynamic.NewForConfig(impersonatedConfig)
	if err != nil {
		return nil, err
	}

	projectGVR := schema.GroupVersionResource{
		Group:    "project.openshift.io",
		Version:  "v1",
		Resource: "projects",
	}

	projectList, err := dynClient.Resource(projectGVR).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	namespaces := make([]v1.Namespace, 0, len(projectList.Items))
	for _, project := range projectList.Items {
		projectName := project.GetName()

		ns, err := c.Clientset.CoreV1().Namespaces().Get(ctx, projectName, metav1.GetOptions{})
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
