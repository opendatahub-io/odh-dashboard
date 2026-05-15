package kubernetes

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	authenticationv1 "k8s.io/api/authentication/v1"
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

// K8sTokenClient implements Kubernetes operations using user tokens
type K8sTokenClient struct {
	Clientset     ClientsetInterface
	DynamicClient DynamicClientInterface
	RestConfig    *rest.Config
}

// K8sTokenClientConfig for injectable constructor (testing)
type K8sTokenClientConfig struct {
	// Configuration for testing - empty for now
}

// DefaultK8sTokenClientConfig for default constructor (production)
type DefaultK8sTokenClientConfig struct {
	// Could have additional fields like custom transport settings
}

// NewK8sTokenClient creates a token client with injectable clientset and dynamic client (for testing)
func NewK8sTokenClient(cfg K8sTokenClientConfig, clientset ClientsetInterface, dynamicClient DynamicClientInterface, restConfig *rest.Config) *K8sTokenClient {
	return &K8sTokenClient{
		Clientset:     clientset,
		DynamicClient: dynamicClient,
		RestConfig:    restConfig,
	}
}

// NewDefaultK8sTokenClient creates a token client with real Kubernetes clientset and dynamic client.
// Automatically detects in-cluster (pod service account) vs out-of-cluster (kubeconfig) environments.
// Wraps all requests with user token authentication via RoundTripper.
// The user token is extracted from the request context via IdentityFromContext.
// Returns an error if Kubernetes configuration cannot be loaded or clients cannot be created.
func NewDefaultK8sTokenClient(cfg DefaultK8sTokenClientConfig) (*K8sTokenClient, error) {
	// Auto-detect in-cluster vs out-of-cluster config
	baseConfig, err := getKubernetesConfig()
	if err != nil {
		return nil, err
	}

	// Wrap transport to inject user bearer token on every request
	clientCfg := rest.CopyConfig(baseConfig)
	clientCfg.WrapTransport = func(rt http.RoundTripper) http.RoundTripper {
		return &tokenRoundTripper{
			base: rt,
		}
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

	return &K8sTokenClient{
		Clientset:     clientset,
		DynamicClient: dynamicClient,
		RestConfig:    clientCfg,
	}, nil
}

func (c *K8sTokenClient) ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
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

func (c *K8sTokenClient) GetResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	return c.DynamicClient.Resource(gvr).Namespace(namespace).Get(timeoutCtx, name, metav1.GetOptions{})
}

func (c *K8sTokenClient) CreateResource(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	return c.DynamicClient.Resource(gvr).Namespace(namespace).Create(timeoutCtx, obj, metav1.CreateOptions{})
}

func (c *K8sTokenClient) GetNamespaces(ctx context.Context) ([]v1.Namespace, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	nsList, err := c.Clientset.CoreV1().Namespaces().List(timeoutCtx, metav1.ListOptions{})
	if err == nil {
		return nsList.Items, nil
	}

	if !k8serrors.IsForbidden(err) {
		return nil, err
	}

	return c.getNamespacesViaProjectsAPI(timeoutCtx)
}

func (c *K8sTokenClient) GetPods(ctx context.Context, namespace string) (*v1.PodList, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	return c.Clientset.CoreV1().Pods(namespace).List(timeoutCtx, metav1.ListOptions{})
}

func (c *K8sTokenClient) GetSecrets(ctx context.Context, namespace string) ([]v1.Secret, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	secretList, err := c.Clientset.CoreV1().Secrets(namespace).List(timeoutCtx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return secretList.Items, nil
}

func (c *K8sTokenClient) GetSecret(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	return c.Clientset.CoreV1().Secrets(namespace).Get(timeoutCtx, secretName, metav1.GetOptions{})
}

func (c *K8sTokenClient) GetUser(ctx context.Context) (string, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	ssr := &authenticationv1.SelfSubjectReview{}
	resp, err := c.Clientset.AuthenticationV1().SelfSubjectReviews().Create(timeoutCtx, ssr, metav1.CreateOptions{})
	if err != nil {
		return "", err
	}

	username := resp.Status.UserInfo.Username
	if username == "" {
		return "", &ValidationError{Field: "token", Message: "no username found in token"}
	}

	return username, nil
}

func (c *K8sTokenClient) IsClusterAdmin(ctx context.Context) (bool, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Check wildcard permissions - the defining characteristic of cluster-admin role
	sar := &authorizationv1.SelfSubjectAccessReview{
		Spec: authorizationv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authorizationv1.ResourceAttributes{
				Verb:     "*",
				Resource: "*",
			},
		},
	}

	resp, err := c.Clientset.AuthorizationV1().SelfSubjectAccessReviews().Create(timeoutCtx, sar, metav1.CreateOptions{})
	if err != nil {
		return false, err
	}

	return resp.Status.Allowed, nil
}

func (c *K8sTokenClient) CanAccessResource(ctx context.Context, namespace, verb, group, resource, name string) (bool, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	sar := &authorizationv1.SelfSubjectAccessReview{
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

	resp, err := c.Clientset.AuthorizationV1().SelfSubjectAccessReviews().Create(timeoutCtx, sar, metav1.CreateOptions{})
	if err != nil {
		return false, err
	}

	return resp.Status.Allowed, nil
}

// DiscoverResourceGVR discovers the preferred API version for a custom resource
// by trying known versions in preference order (newer to older).
// Returns the first working GroupVersionResource or an error if none are available.
func (c *K8sTokenClient) DiscoverResourceGVR(
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

		// Test with namespace-scoped query (respects RBAC)
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

// getNamespacesViaProjectsAPI lists namespaces via OpenShift Projects API when cluster-wide
// namespace listing is forbidden. Falls back to project metadata if namespace details are unavailable.
// This method expects the caller to have already set an appropriate timeout on the context.
func (c *K8sTokenClient) getNamespacesViaProjectsAPI(ctx context.Context) ([]v1.Namespace, error) {
	dynClient, err := dynamic.NewForConfig(c.RestConfig)
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

// tokenRoundTripper injects the user's bearer token into all Kubernetes API requests.
// The token is extracted from the RequestIdentity stored in the request context.
type tokenRoundTripper struct {
	base http.RoundTripper
}

func (t *tokenRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	ctx := req.Context()
	identity, err := IdentityFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if identity.Token == "" {
		return nil, errors.New("identity token is empty")
	}

	req2 := req.Clone(ctx)
	req2.Header.Set("Authorization", "Bearer "+identity.Token)
	return t.base.RoundTrip(req2)
}
