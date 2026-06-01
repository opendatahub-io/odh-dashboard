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

// k8sTokenClient implements Kubernetes operations using user tokens.
type k8sTokenClient struct {
	Clientset     Clientset
	DynamicClient DynamicClient
}


// NewK8sTokenClient creates a token client with injectable Clientset and DynamicClient (for testing).
func NewK8sTokenClient(cs Clientset, dc DynamicClient) K8sClient {
	return &k8sTokenClient{
		Clientset:     cs,
		DynamicClient: dc,
	}
}

// NewDefaultK8sTokenClient creates a token client with real Kubernetes Clientset and dynamic client.
// Automatically detects in-cluster (pod service account) vs out-of-cluster (kubeconfig) environments.
// Wraps all requests with user token authentication via RoundTripper.
// The user token is extracted from the request context via IdentityFromContext.
// Returns an error if Kubernetes configuration cannot be loaded or clients cannot be created.
func NewDefaultK8sTokenClient() (K8sClient, error) {
	baseConfig, err := getKubernetesConfig()
	if err != nil {
		return nil, err
	}

	clientCfg := rest.CopyConfig(baseConfig)
	clientCfg.WrapTransport = func(rt http.RoundTripper) http.RoundTripper {
		return &tokenRoundTripper{base: rt}
	}

	cs, err := kubernetes.NewForConfig(clientCfg)
	if err != nil {
		return nil, err
	}

	dc, err := dynamic.NewForConfig(clientCfg)
	if err != nil {
		return nil, err
	}

	return &k8sTokenClient{
		Clientset:     cs,
		DynamicClient: dc,
	}, nil
}

func (c *k8sTokenClient) ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
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

func (c *k8sTokenClient) GetResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	return c.DynamicClient.Resource(gvr).Namespace(namespace).Get(timeoutCtx, name, metav1.GetOptions{})
}

func (c *k8sTokenClient) CreateResource(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	return c.DynamicClient.Resource(gvr).Namespace(namespace).Create(timeoutCtx, obj, metav1.CreateOptions{})
}

func (c *k8sTokenClient) GetNamespaces(ctx context.Context) ([]v1.Namespace, error) {
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

func (c *k8sTokenClient) GetPods(ctx context.Context, namespace string) (*v1.PodList, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	return c.Clientset.CoreV1().Pods(namespace).List(timeoutCtx, metav1.ListOptions{})
}

func (c *k8sTokenClient) GetSecrets(ctx context.Context, namespace string) ([]v1.Secret, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	secretList, err := c.Clientset.CoreV1().Secrets(namespace).List(timeoutCtx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return secretList.Items, nil
}

func (c *k8sTokenClient) GetSecret(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	return c.Clientset.CoreV1().Secrets(namespace).Get(timeoutCtx, secretName, metav1.GetOptions{})
}

func (c *k8sTokenClient) GetUser(ctx context.Context) (string, error) {
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

func (c *k8sTokenClient) IsClusterAdmin(ctx context.Context) (bool, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

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

func (c *k8sTokenClient) CanAccessResource(ctx context.Context, namespace, verb, group, resource, name string) (bool, error) {
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

func (c *k8sTokenClient) DiscoverResourceGVR(
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

// getNamespacesViaProjectsAPI lists namespaces via the OpenShift Projects API when
// cluster-wide namespace listing is forbidden. Uses the existing DynamicClient so no
// additional config or client construction is needed.
func (c *k8sTokenClient) getNamespacesViaProjectsAPI(ctx context.Context) ([]v1.Namespace, error) {
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

// Compile-time interface check.
var _ K8sClient = (*k8sTokenClient)(nil)

// NewBearerTokenRoundTripper wraps base with a RoundTripper that injects the user's
// bearer token from the RequestIdentity stored in each request's context.
func NewBearerTokenRoundTripper(base http.RoundTripper) http.RoundTripper {
	return &tokenRoundTripper{base: base}
}

// tokenRoundTripper injects the user's bearer token into all Kubernetes API requests.
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
