package k8smocks

import (
	"context"
	"fmt"
	"testing"

	ogxapi "github.com/ogx-ai/ogx-k8s-operator/api/v1beta1"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	discoveryv1 "k8s.io/api/discovery/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestMockAudioNamespaceHasReadyOGXServer(t *testing.T) {
	scheme := runtime.NewScheme()
	require.NoError(t, ogxapi.AddToScheme(scheme))
	mockClient := &TokenKubernetesClientMock{TokenKubernetesClient: &k8s.TokenKubernetesClient{
		Client: fake.NewClientBuilder().WithScheme(scheme).Build(),
	}}

	servers, err := mockClient.GetOGXServers(context.Background(), nil, "mock-audio-namespace")
	require.NoError(t, err)
	require.Len(t, servers.Items, 1)
	require.Equal(t, ogxapi.OGXServerPhaseReady, servers.Items[0].Status.Phase)
	require.Equal(t, "http://mock-lsd.mock-audio-namespace.svc.cluster.local:8321", servers.Items[0].Status.ServiceURL)
}

// TestMockServiceLookupsWithCallerTokenDoNotPanic guards the mock overrides for
// GetService and GetServiceBackendAddresses: the embedded implementations would
// build a caller-credential client from the nil rest.Config and panic.
func TestMockServiceLookupsWithCallerTokenDoNotPanic(t *testing.T) {
	scheme := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(scheme))
	require.NoError(t, discoveryv1.AddToScheme(scheme))

	ns := "test-namespace"
	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Namespace: ns, Name: "my-model"},
		Spec: corev1.ServiceSpec{
			Type:     corev1.ServiceTypeClusterIP,
			Selector: map[string]string{"app": "my-model"},
		},
	}
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Namespace: ns, Name: "my-model-abc"},
		Status:     corev1.PodStatus{PodIP: "10.244.0.5", PodIPs: []corev1.PodIP{{IP: "10.244.0.5"}}},
	}
	slice := &discoveryv1.EndpointSlice{
		ObjectMeta: metav1.ObjectMeta{
			Namespace: ns,
			Name:      "my-model-x",
			Labels:    map[string]string{discoveryv1.LabelServiceName: "my-model"},
		},
		AddressType: discoveryv1.AddressTypeIPv4,
		Endpoints:   []discoveryv1.Endpoint{{Addresses: []string{"10.244.0.5"}}},
	}

	mockClient := &TokenKubernetesClientMock{TokenKubernetesClient: &k8s.TokenKubernetesClient{
		Client: fake.NewClientBuilder().WithScheme(scheme).WithObjects(service, pod, slice).Build(),
	}}
	identity := &integrations.RequestIdentity{Token: "user-token"}

	svc, err := mockClient.GetService(context.Background(), identity, ns, "my-model")
	require.NoError(t, err)
	require.Equal(t, "my-model", svc.Name)

	addrs, err := mockClient.GetServiceBackendAddresses(context.Background(), identity, ns, "my-model")
	require.NoError(t, err)
	require.Equal(t, []string{"10.244.0.5"}, addrs)
}

// TestConfigurableMockKubernetesClientServiceLookups covers the configurable
// responses used by handler-level tests of the verification trust decision.
func TestConfigurableMockKubernetesClientServiceLookups(t *testing.T) {
	client := &ConfigurableMockKubernetesClient{
		Service: &corev1.Service{
			ObjectMeta: metav1.ObjectMeta{Namespace: "test-namespace", Name: "my-model"},
			Spec: corev1.ServiceSpec{
				Type:     corev1.ServiceTypeClusterIP,
				Selector: map[string]string{"app": "my-model"},
			},
		},
		ServiceBackendAddresses: []string{"10.244.0.5"},
	}

	svc, err := client.GetService(context.Background(), nil, "test-namespace", "my-model")
	require.NoError(t, err)
	require.Equal(t, "my-model", svc.Name)

	addrs, err := client.GetServiceBackendAddresses(context.Background(), nil, "test-namespace", "my-model")
	require.NoError(t, err)
	require.Equal(t, []string{"10.244.0.5"}, addrs)

	failing := &ConfigurableMockKubernetesClient{ServiceError: fmt.Errorf("forbidden")}
	_, err = failing.GetService(context.Background(), nil, "test-namespace", "my-model")
	require.Error(t, err)

	empty := &ConfigurableMockKubernetesClient{}
	addrs, err = empty.GetServiceBackendAddresses(context.Background(), nil, "test-namespace", "my-model")
	require.NoError(t, err)
	require.Empty(t, addrs)
}
