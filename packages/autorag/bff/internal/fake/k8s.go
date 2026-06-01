package fake

import (
	"context"

	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// K8sClient is a fake implementation of kubernetes.Client for local development and testing.
type K8sClient struct{}

var _ kubernetes.Client = (*K8sClient)(nil)

func (c *K8sClient) ListResources(_ context.Context, _ schema.GroupVersionResource, _ string) (*unstructured.UnstructuredList, error) {
	return &unstructured.UnstructuredList{}, nil
}

func (c *K8sClient) GetResource(_ context.Context, _ schema.GroupVersionResource, _, _ string) (*unstructured.Unstructured, error) {
	return &unstructured.Unstructured{}, nil
}

func (c *K8sClient) CreateResource(_ context.Context, _ schema.GroupVersionResource, _ string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	return obj, nil
}

func (c *K8sClient) GetNamespaces(_ context.Context) ([]v1.Namespace, error) {
	return []v1.Namespace{
		{ObjectMeta: metav1.ObjectMeta{Name: "default"}},
	}, nil
}

func (c *K8sClient) GetPods(_ context.Context, _ string) (*v1.PodList, error) {
	return &v1.PodList{}, nil
}

func (c *K8sClient) GetSecrets(_ context.Context, _ string) ([]v1.Secret, error) {
	return []v1.Secret{}, nil
}

func (c *K8sClient) GetSecret(_ context.Context, namespace, secretName string) (*v1.Secret, error) {
	return &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      secretName,
			Namespace: namespace,
		},
	}, nil
}

func (c *K8sClient) GetUser(_ context.Context) (string, error) {
	return "fake-user@example.com", nil
}

func (c *K8sClient) IsClusterAdmin(_ context.Context) (bool, error) {
	return true, nil
}

func (c *K8sClient) CanAccessResource(_ context.Context, _, _, _, _, _ string) (bool, error) {
	return true, nil
}

func (c *K8sClient) DiscoverResourceGVR(_ context.Context, group, resource, _ string, knownVersions []string) (schema.GroupVersionResource, error) {
	if len(knownVersions) > 0 {
		return schema.GroupVersionResource{
			Group:    group,
			Version:  knownVersions[0],
			Resource: resource,
		}, nil
	}
	return schema.GroupVersionResource{}, nil
}
