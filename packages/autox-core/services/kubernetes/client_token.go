package kubernetes

import (
	"context"
	"net/http"
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
	GetAuthToken  func(ctx context.Context) (string, error)
	RestConfig    *rest.Config
}

// K8sTokenClientConfig for injectable constructor (testing)
type K8sTokenClientConfig struct {
	GetAuthToken func(ctx context.Context) (string, error)
}

// DefaultK8sTokenClientConfig for default constructor (production)
type DefaultK8sTokenClientConfig struct {
	GetAuthToken func(ctx context.Context) (string, error)
	// Could have additional fields like custom transport settings
}

// NewK8sTokenClient creates a token client with injectable clientset and dynamic client (for testing)
func NewK8sTokenClient(cfg K8sTokenClientConfig, clientset ClientsetInterface, dynamicClient DynamicClientInterface, restConfig *rest.Config) *K8sTokenClient {
	return &K8sTokenClient{
		Clientset:     clientset,
		DynamicClient: dynamicClient,
		GetAuthToken:  cfg.GetAuthToken,
		RestConfig:    restConfig,
	}
}

// NewDefaultK8sTokenClient creates a token client with real Kubernetes clientset and dynamic client
func NewDefaultK8sTokenClient(cfg DefaultK8sTokenClientConfig) *K8sTokenClient {
	// Configure with token-based auth using RoundTripper
	clientCfg := &rest.Config{
		Host: "https://kubernetes.default.svc",
		WrapTransport: func(rt http.RoundTripper) http.RoundTripper {
			return &tokenRoundTripper{
				base:         rt,
				getAuthToken: cfg.GetAuthToken,
			}
		},
	}

	clientset, err := kubernetes.NewForConfig(clientCfg)
	if err != nil {
		panic(err) // Or return error
	}

	// Create dynamic client with the same config
	dynamicClient, err := dynamic.NewForConfig(clientCfg)
	if err != nil {
		panic(err) // Or return error
	}

	return &K8sTokenClient{
		Clientset:     clientset,
		DynamicClient: dynamicClient,
		GetAuthToken:  cfg.GetAuthToken,
		RestConfig:    clientCfg,
	}
}

func (c *K8sTokenClient) ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
	var resourceClient dynamic.ResourceInterface
	if namespace != "" {
		resourceClient = c.DynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		resourceClient = c.DynamicClient.Resource(gvr)
	}

	return resourceClient.List(ctx, metav1.ListOptions{})
}

func (c *K8sTokenClient) GetResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error) {
	return c.DynamicClient.Resource(gvr).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (c *K8sTokenClient) CreateResource(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	return c.DynamicClient.Resource(gvr).Namespace(namespace).Create(ctx, obj, metav1.CreateOptions{})
}

func (c *K8sTokenClient) GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]v1.Namespace, error) {
	nsList, err := c.Clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err == nil {
		return nsList.Items, nil
	}

	// If forbidden, fall back to OpenShift Projects API
	if !isErrorForbidden(err) {
		return nil, err
	}

	return c.getNamespacesViaProjectsAPI(ctx)
}

func (c *K8sTokenClient) GetPods(ctx context.Context, identity *RequestIdentity, namespace string) (*v1.PodList, error) {
	return c.Clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
}

func (c *K8sTokenClient) GetSecrets(ctx context.Context, identity *RequestIdentity, namespace string) ([]v1.Secret, error) {
	secretList, err := c.Clientset.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return secretList.Items, nil
}

func (c *K8sTokenClient) GetSecret(ctx context.Context, identity *RequestIdentity, namespace, secretName string) (*v1.Secret, error) {
	return c.Clientset.CoreV1().Secrets(namespace).Get(ctx, secretName, metav1.GetOptions{})
}

func (c *K8sTokenClient) GetUser(identity *RequestIdentity) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	ssr := &authenticationv1.SelfSubjectReview{}
	resp, err := c.Clientset.AuthenticationV1().SelfSubjectReviews().Create(ctx, ssr, metav1.CreateOptions{})
	if err != nil {
		return "", err
	}

	username := resp.Status.UserInfo.Username
	if username == "" {
		return "", &ValidationError{Field: "token", Message: "no username found in token"}
	}

	return username, nil
}

func (c *K8sTokenClient) IsClusterAdmin(identity *RequestIdentity) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Use SelfSubjectAccessReview with wildcard permissions
	sar := &authorizationv1.SelfSubjectAccessReview{
		Spec: authorizationv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authorizationv1.ResourceAttributes{
				Verb:     "*",
				Resource: "*",
			},
		},
	}

	resp, err := c.Clientset.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		return false, err
	}

	return resp.Status.Allowed, nil
}

func (c *K8sTokenClient) CanAccessResource(ctx context.Context, identity *RequestIdentity, namespace, verb, group, resource, name string) (bool, error) {
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

	resp, err := c.Clientset.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		return false, err
	}

	return resp.Status.Allowed, nil
}

func (c *K8sTokenClient) GetClientset() any {
	return c.Clientset
}

func (c *K8sTokenClient) GetRestConfig() *rest.Config {
	return c.RestConfig
}

// getNamespacesViaProjectsAPI uses the OpenShift Projects API to list namespaces accessible to the caller
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
			if isErrorForbidden(err) || isErrorNotFound(err) {
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

// Helper functions for error checking
func isErrorForbidden(err error) bool {
	return k8serrors.IsForbidden(err)
}

func isErrorNotFound(err error) bool {
	return k8serrors.IsNotFound(err)
}

// tokenRoundTripper injects bearer token into requests
type tokenRoundTripper struct {
	base         http.RoundTripper
	getAuthToken func(ctx context.Context) (string, error)
}

func (t *tokenRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	token, err := t.getAuthToken(req.Context())
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	return t.base.RoundTrip(req)
}
