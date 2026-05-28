package mocks

import (
	"context"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"

	k8ssvc "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

// MockK8sClient implements k8ssvc.K8sClientInterface with configurable function fields.
// Each field is optional — if nil, the method returns a zero value and nil error.
type MockK8sClient struct {
	ListResourcesFunc     func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error)
	GetResourceFunc       func(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error)
	CreateResourceFunc    func(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error)
	GetNamespacesFunc     func(ctx context.Context) ([]v1.Namespace, error)
	GetPodsFunc           func(ctx context.Context, namespace string) (*v1.PodList, error)
	GetSecretsFunc        func(ctx context.Context, namespace string) ([]v1.Secret, error)
	GetSecretFunc         func(ctx context.Context, namespace, secretName string) (*v1.Secret, error)
	GetUserFunc           func(ctx context.Context) (string, error)
	IsClusterAdminFunc    func(ctx context.Context) (bool, error)
	CanAccessResourceFunc func(ctx context.Context, namespace, verb, group, resource, name string) (bool, error)
	DiscoverResourceGVRFunc func(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error)
}

func (m *MockK8sClient) ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
	if m.ListResourcesFunc != nil {
		return m.ListResourcesFunc(ctx, gvr, namespace)
	}
	return &unstructured.UnstructuredList{}, nil
}

func (m *MockK8sClient) GetResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error) {
	if m.GetResourceFunc != nil {
		return m.GetResourceFunc(ctx, gvr, namespace, name)
	}
	return &unstructured.Unstructured{}, nil
}

func (m *MockK8sClient) CreateResource(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	if m.CreateResourceFunc != nil {
		return m.CreateResourceFunc(ctx, gvr, namespace, obj)
	}
	return obj, nil
}

func (m *MockK8sClient) GetNamespaces(ctx context.Context) ([]v1.Namespace, error) {
	if m.GetNamespacesFunc != nil {
		return m.GetNamespacesFunc(ctx)
	}
	return []v1.Namespace{}, nil
}

func (m *MockK8sClient) GetPods(ctx context.Context, namespace string) (*v1.PodList, error) {
	if m.GetPodsFunc != nil {
		return m.GetPodsFunc(ctx, namespace)
	}
	return &v1.PodList{}, nil
}

func (m *MockK8sClient) GetSecrets(ctx context.Context, namespace string) ([]v1.Secret, error) {
	if m.GetSecretsFunc != nil {
		return m.GetSecretsFunc(ctx, namespace)
	}
	return []v1.Secret{}, nil
}

func (m *MockK8sClient) GetSecret(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
	if m.GetSecretFunc != nil {
		return m.GetSecretFunc(ctx, namespace, secretName)
	}
	return &v1.Secret{ObjectMeta: metav1.ObjectMeta{Name: secretName, Namespace: namespace}}, nil
}

func (m *MockK8sClient) GetUser(ctx context.Context) (string, error) {
	if m.GetUserFunc != nil {
		return m.GetUserFunc(ctx)
	}
	return "mock-user", nil
}

func (m *MockK8sClient) IsClusterAdmin(ctx context.Context) (bool, error) {
	if m.IsClusterAdminFunc != nil {
		return m.IsClusterAdminFunc(ctx)
	}
	return false, nil
}

func (m *MockK8sClient) CanAccessResource(ctx context.Context, namespace, verb, group, resource, name string) (bool, error) {
	if m.CanAccessResourceFunc != nil {
		return m.CanAccessResourceFunc(ctx, namespace, verb, group, resource, name)
	}
	return true, nil
}

func (m *MockK8sClient) DiscoverResourceGVR(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
	if m.DiscoverResourceGVRFunc != nil {
		return m.DiscoverResourceGVRFunc(ctx, group, resource, namespace, knownVersions)
	}
	if len(knownVersions) > 0 {
		return schema.GroupVersionResource{Group: group, Version: knownVersions[0], Resource: resource}, nil
	}
	return schema.GroupVersionResource{}, nil
}

// Compile-time check.
var _ k8ssvc.K8sClientInterface = (*MockK8sClient)(nil)
