package kubernetes

import (
	"context"
	"net/http"

	v1 "k8s.io/api/core/v1"
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
func NewK8sTokenClient(cfg K8sTokenClientConfig, clientset ClientsetInterface, dynamicClient DynamicClientInterface) *K8sTokenClient {
	return &K8sTokenClient{
		Clientset:     clientset,
		DynamicClient: dynamicClient,
		GetAuthToken:  cfg.GetAuthToken,
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

func (c *K8sTokenClient) GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]string, error) {
	list, err := c.Clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	namespaces := make([]string, len(list.Items))
	for i, ns := range list.Items {
		namespaces[i] = ns.Name
	}

	return namespaces, nil
}

func (c *K8sTokenClient) GetPods(ctx context.Context, namespace string, identity *RequestIdentity) (*v1.PodList, error) {
	return c.Clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
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
