package api

import (
	"context"
	"fmt"
	"net/http"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
)

type stubDynClient struct {
	k8s.KubernetesClientInterface
	dyn dynamic.Interface
}

func (s *stubDynClient) GetDynamicClient() (dynamic.Interface, error) { return s.dyn, nil }
func (s *stubDynClient) GetNamespaces(_ context.Context, _ *k8s.RequestIdentity) ([]corev1.Namespace, error) {
	return nil, nil
}
func (s *stubDynClient) IsClusterAdmin(_ context.Context, _ *k8s.RequestIdentity) (bool, error) {
	return false, nil
}
func (s *stubDynClient) GetUser(_ context.Context, _ *k8s.RequestIdentity) (string, error) {
	return "", nil
}
func (s *stubDynClient) IsUserAdmin(_ context.Context, _ *k8s.RequestIdentity) (bool, error) {
	return false, nil
}
func (s *stubDynClient) IsUserAllowed(_ context.Context, _ *k8s.RequestIdentity) (bool, error) {
	return false, nil
}
func (s *stubDynClient) GetConfigMap(_ context.Context, _, _ string) (*corev1.ConfigMap, error) {
	return nil, nil
}
func (s *stubDynClient) ListConfigMaps(_ context.Context, _ string, _ string) (*corev1.ConfigMapList, error) {
	return nil, nil
}
func (s *stubDynClient) CreateConfigMap(_ context.Context, _ string, _ *corev1.ConfigMap) (*corev1.ConfigMap, error) {
	return nil, nil
}
func (s *stubDynClient) UpdateConfigMap(_ context.Context, _ string, _ *corev1.ConfigMap) (*corev1.ConfigMap, error) {
	return nil, nil
}
func (s *stubDynClient) PatchConfigMap(_ context.Context, _, _ string, _ []byte, _ types.PatchType) (*corev1.ConfigMap, error) {
	return nil, nil
}
func (s *stubDynClient) DeleteConfigMap(_ context.Context, _, _ string) error { return nil }

// failingGetUserClient is a KubernetesClientInterface where GetUser always fails.
// Used to test the expired/invalid token path in secureRoute/secureAdminRoute.
type failingGetUserClient struct {
	stubDynClient
}

func (f *failingGetUserClient) GetUser(_ context.Context, _ *k8s.RequestIdentity) (string, error) {
	return "", fmt.Errorf("SelfSubjectReview failed: token expired")
}

// failingGetUserFactory is a KubernetesClientFactory that returns a failingGetUserClient.
type failingGetUserFactory struct{}

func (f *failingGetUserFactory) ExtractRequestIdentity(h http.Header) (*k8s.RequestIdentity, error) {
	return nil, fmt.Errorf("not implemented")
}

func (f *failingGetUserFactory) ValidateRequestIdentity(_ *k8s.RequestIdentity) error {
	return nil
}

func (f *failingGetUserFactory) GetClient(_ context.Context) (k8s.KubernetesClientInterface, error) {
	return &failingGetUserClient{}, nil
}

// failingAdminCheckClient is a KubernetesClientInterface where GetUser succeeds
// but IsUserAdmin always fails. Used to test the adminCheckError audit path.
type failingAdminCheckClient struct {
	stubDynClient
	username string
}

func (f *failingAdminCheckClient) GetUser(_ context.Context, _ *k8s.RequestIdentity) (string, error) {
	return f.username, nil
}

func (f *failingAdminCheckClient) IsUserAdmin(_ context.Context, _ *k8s.RequestIdentity) (bool, error) {
	return false, fmt.Errorf("SSAR check failed: connection refused")
}

// failingAdminCheckFactory is a KubernetesClientFactory that returns a failingAdminCheckClient.
type failingAdminCheckFactory struct {
	username string
}

func (f *failingAdminCheckFactory) ExtractRequestIdentity(_ http.Header) (*k8s.RequestIdentity, error) {
	return nil, fmt.Errorf("not implemented")
}

func (f *failingAdminCheckFactory) ValidateRequestIdentity(_ *k8s.RequestIdentity) error {
	return nil
}

func (f *failingAdminCheckFactory) GetClient(_ context.Context) (k8s.KubernetesClientInterface, error) {
	return &failingAdminCheckClient{username: f.username}, nil
}
