package kubernetes

import (
	"context"
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
		RestConfig:    clientCfg,
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

func (c *K8sInternalClient) GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]v1.Namespace, error) {
	nsList, err := c.Clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
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
	return c.Clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
}

func (c *K8sInternalClient) GetSecrets(ctx context.Context, identity *RequestIdentity, namespace string) ([]v1.Secret, error) {
	secretList, err := c.Clientset.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return secretList.Items, nil
}

func (c *K8sInternalClient) GetSecret(ctx context.Context, identity *RequestIdentity, namespace, secretName string) (*v1.Secret, error) {
	return c.Clientset.CoreV1().Secrets(namespace).Get(ctx, secretName, metav1.GetOptions{})
}

func (c *K8sInternalClient) GetUser(identity *RequestIdentity) (string, error) {
	return identity.UserID, nil
}

func (c *K8sInternalClient) IsClusterAdmin(identity *RequestIdentity) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	crbList, err := c.Clientset.RbacV1().ClusterRoleBindings().List(ctx, metav1.ListOptions{})
	if err != nil {
		return false, err
	}

	for _, crb := range crbList.Items {
		if crb.RoleRef.Kind != "ClusterRole" || crb.RoleRef.Name != "cluster-admin" {
			continue
		}
		for _, subject := range crb.Subjects {
			if subject.Kind == "User" && subject.Name == identity.UserID {
				return true, nil
			}
		}
	}

	return false, nil
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
