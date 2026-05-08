package kubernetes

import (
	"context"

	v1 "k8s.io/api/core/v1"
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
func NewK8sInternalClient(cfg K8sInternalClientConfig, clientset ClientsetInterface, dynamicClient DynamicClientInterface) *K8sInternalClient {
	return &K8sInternalClient{
		Clientset:     clientset,
		DynamicClient: dynamicClient,
	}
}

// NewDefaultK8sInternalClient creates an internal client with real Kubernetes clientset and dynamic client
func NewDefaultK8sInternalClient(cfg DefaultK8sInternalClientConfig) *K8sInternalClient {
	// Use in-cluster config for service account authentication
	clientCfg, err := rest.InClusterConfig()
	if err != nil {
		panic(err) // Or return error
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

	return &K8sInternalClient{
		Clientset:     clientset,
		DynamicClient: dynamicClient,
	}
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

func (c *K8sInternalClient) GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]string, error) {
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

func (c *K8sInternalClient) GetPods(ctx context.Context, namespace string, identity *RequestIdentity) (*v1.PodList, error) {
	return c.Clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
}
