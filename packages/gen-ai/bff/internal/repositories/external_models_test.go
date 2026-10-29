package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"reflect"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
)

func TestIsInternalHost(t *testing.T) {
	tests := []struct {
		name      string
		baseURL   string
		namespace string
		want      bool
	}{
		{
			name:      "in-cluster service in caller's namespace is trusted",
			baseURL:   "https://my-model.test-namespace.svc.cluster.local:8080/v1",
			namespace: "test-namespace",
			want:      true,
		},
		{
			name:      "http in-cluster service in caller's namespace is trusted",
			baseURL:   "http://my-model.test-namespace.svc.cluster.local/v1",
			namespace: "test-namespace",
			want:      true,
		},
		{
			name:      "in-cluster service in a different namespace is not trusted",
			baseURL:   "https://my-model.other-namespace.svc.cluster.local:8080/v1",
			namespace: "test-namespace",
			want:      false,
		},
		{
			name:      "namespace-like service name does not trick the namespace label",
			baseURL:   "https://other-namespace.my-model.test-namespace.svc.cluster.local/v1",
			namespace: "test-namespace",
			want:      true,
		},
		{
			name:      "namespace prefix match is not enough",
			baseURL:   "https://my-model.test-namespace-extra.svc.cluster.local/v1",
			namespace: "test-namespace",
			want:      false,
		},
		{
			name:      "localhost is trusted for local development",
			baseURL:   "http://localhost:8080/v1",
			namespace: "test-namespace",
			want:      true,
		},
		{
			name:      "loopback IP is trusted for local development",
			baseURL:   "http://127.0.0.1:8080/v1",
			namespace: "test-namespace",
			want:      true,
		},
		{
			name:      "external host is not trusted",
			baseURL:   "https://api.openai.com/v1",
			namespace: "test-namespace",
			want:      false,
		},
		{
			name:      "private IP is not trusted without SSRF validation",
			baseURL:   "http://10.0.0.1/v1",
			namespace: "test-namespace",
			want:      false,
		},
		{
			name:      "overly-broad cluster.local suffix is not trusted",
			baseURL:   "https://evil.cluster.local/v1",
			namespace: "cluster",
			want:      false,
		},
		{
			name:      "invalid URL is not trusted",
			baseURL:   "://not-a-url",
			namespace: "test-namespace",
			want:      false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isInternalHost(tt.baseURL, tt.namespace); got != tt.want {
				t.Errorf("isInternalHost(%q, %q) = %v, want %v", tt.baseURL, tt.namespace, got, tt.want)
			}
		})
	}
}

// stubK8sClient stubs GetService and GetServiceBackendAddresses; all other
// interface methods are unused by these tests.
type stubK8sClient struct {
	kubernetes.KubernetesClientInterface
	service         *corev1.Service
	err             error
	backendAddrs    []string
	backendAddrsErr error

	gotNamespace string
	gotName      string
}

func (s *stubK8sClient) GetService(ctx context.Context, identity *integrations.RequestIdentity, namespace string, name string) (*corev1.Service, error) {
	s.gotNamespace = namespace
	s.gotName = name
	if s.err != nil {
		return nil, s.err
	}
	return s.service, nil
}

func (s *stubK8sClient) GetServiceBackendAddresses(ctx context.Context, identity *integrations.RequestIdentity, namespace string, name string) ([]string, error) {
	if s.backendAddrsErr != nil {
		return nil, s.backendAddrsErr
	}
	return s.backendAddrs, nil
}

func TestResolveTrustedHost(t *testing.T) {
	tests := []struct {
		name            string
		baseURL         string
		namespace       string
		service         *corev1.Service
		getServiceErr   error
		backendAddrs    []string
		backendAddrsErr error
		wantTrusted     bool
		wantIPs         []string
		wantService     string
	}{
		{
			name:      "in-namespace ExternalName alias targeting another namespace is not trusted",
			baseURL:   "https://evil.test-namespace.svc.cluster.local:8080/v1",
			namespace: "test-namespace",
			service: &corev1.Service{
				Spec: corev1.ServiceSpec{
					Type:         corev1.ServiceTypeExternalName,
					ExternalName: "victim.other-namespace.svc.cluster.local",
				},
			},
			wantTrusted: false,
		},
		{
			name:      "in-namespace ClusterIP service is trusted with its validated backends pinned",
			baseURL:   "https://my-model.test-namespace.svc.cluster.local:8080/v1",
			namespace: "test-namespace",
			service: &corev1.Service{
				Spec: corev1.ServiceSpec{
					Type:       corev1.ServiceTypeClusterIP,
					ClusterIP:  "10.96.10.5",
					ClusterIPs: []string{"10.96.10.5"},
					Selector:   map[string]string{"app": "my-model"},
				},
			},
			backendAddrs: []string{"10.244.0.5", "10.244.0.6"},
			wantTrusted:  true,
			wantIPs:      []string{"10.244.0.5", "10.244.0.6"},
			wantService:  "my-model",
		},
		{
			name:      "pod DNS name resolves the backing service, not the pod label",
			baseURL:   "https://model-0.model-headless.test-namespace.svc.cluster.local:8080/v1",
			namespace: "test-namespace",
			service: &corev1.Service{
				Spec: corev1.ServiceSpec{
					Type:       corev1.ServiceTypeClusterIP,
					ClusterIP:  "10.96.10.6",
					ClusterIPs: []string{"10.96.10.6"},
					Selector:   map[string]string{"app": "model-headless"},
				},
			},
			backendAddrs: []string{"10.244.0.7"},
			wantTrusted:  true,
			wantIPs:      []string{"10.244.0.7"},
			wantService:  "model-headless",
		},
		{
			name:      "in-namespace headless service is not trusted",
			baseURL:   "https://my-model.test-namespace.svc.cluster.local:8080/v1",
			namespace: "test-namespace",
			service: &corev1.Service{
				Spec: corev1.ServiceSpec{
					Type:      corev1.ServiceTypeClusterIP,
					ClusterIP: "None",
					Selector:  map[string]string{"app": "my-model"},
				},
			},
			wantTrusted: false,
		},
		{
			name:      "in-namespace selectorless service with manually managed endpoints is not trusted",
			baseURL:   "https://my-model.test-namespace.svc.cluster.local:8080/v1",
			namespace: "test-namespace",
			service: &corev1.Service{
				Spec: corev1.ServiceSpec{
					Type:       corev1.ServiceTypeClusterIP,
					ClusterIP:  "10.96.10.7",
					ClusterIPs: []string{"10.96.10.7"},
					Selector:   nil,
				},
			},
			wantTrusted: false,
		},
		{
			name:      "selector-backed service with only cross-namespace endpoint addresses is not trusted",
			baseURL:   "https://my-model.test-namespace.svc.cluster.local:8080/v1",
			namespace: "test-namespace",
			service: &corev1.Service{
				Spec: corev1.ServiceSpec{
					Type:      corev1.ServiceTypeClusterIP,
					ClusterIP: "10.96.10.8",
					Selector:  map[string]string{"app": "my-model"},
				},
			},
			// A manually managed EndpointSlice attached a Pod IP from another
			// namespace; no endpoint belongs to a Pod in the caller's namespace.
			backendAddrs: nil,
			wantTrusted:  false,
			wantService:  "my-model",
		},
		{
			name:      "service whose backend lookup fails is not trusted",
			baseURL:   "https://my-model.test-namespace.svc.cluster.local:8080/v1",
			namespace: "test-namespace",
			service: &corev1.Service{
				Spec: corev1.ServiceSpec{
					Type:     corev1.ServiceTypeClusterIP,
					Selector: map[string]string{"app": "my-model"},
				},
			},
			backendAddrsErr: fmt.Errorf("endpoint slice lookup forbidden"),
			wantTrusted:     false,
		},
		{
			name:          "service lookup the caller is not authorized for is not trusted",
			baseURL:       "https://gone.test-namespace.svc.cluster.local:8080/v1",
			namespace:     "test-namespace",
			getServiceErr: fmt.Errorf("forbidden"),
			wantTrusted:   false,
		},
		{
			name:        "service in another namespace is not trusted",
			baseURL:     "https://my-model.other-namespace.svc.cluster.local:8080/v1",
			namespace:   "test-namespace",
			wantTrusted: false,
		},
		{
			name:        "localhost is trusted for local development",
			baseURL:     "http://localhost:8080/v1",
			namespace:   "test-namespace",
			wantTrusted: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := &stubK8sClient{service: tt.service, err: tt.getServiceErr, backendAddrs: tt.backendAddrs, backendAddrsErr: tt.backendAddrsErr}
			trusted, ips := resolveTrustedHost(context.Background(), client, nil, tt.baseURL, tt.namespace, slog.Default())
			if trusted != tt.wantTrusted {
				t.Errorf("resolveTrustedHost(%q, %q) trusted = %v, want %v", tt.baseURL, tt.namespace, trusted, tt.wantTrusted)
			}
			if !reflect.DeepEqual(ips, tt.wantIPs) {
				t.Errorf("resolveTrustedHost(%q, %q) ips = %v, want %v", tt.baseURL, tt.namespace, ips, tt.wantIPs)
			}
			if tt.wantService != "" && client.gotName != tt.wantService {
				t.Errorf("resolveTrustedHost(%q, %q) looked up service %q, want %q", tt.baseURL, tt.namespace, client.gotName, tt.wantService)
			}
			if tt.wantService != "" && client.gotNamespace != tt.namespace {
				t.Errorf("resolveTrustedHost(%q, %q) looked up namespace %q, want %q", tt.baseURL, tt.namespace, client.gotNamespace, tt.namespace)
			}
		})
	}
}

// TestVerifyExternalModelPinsTrustedServiceToNamespaceBackends covers the full
// authorized-namespace to Service-lookup to pinned-connection flow: the request
// succeeds against a Service whose validated backends include the test server,
// without resolving the service DNS name.
func TestVerifyExternalModelPinsTrustedServiceToNamespaceBackends(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{"id": "1", "choices": []any{}})
	}))
	defer server.Close()
	serverURL, err := url.Parse(server.URL)
	require.NoError(t, err)

	client := &stubK8sClient{
		service: &corev1.Service{
			Spec: corev1.ServiceSpec{
				Type:      corev1.ServiceTypeClusterIP,
				ClusterIP: "10.96.10.5",
				Selector:  map[string]string{"app": "my-model"},
			},
		},
		backendAddrs: []string{"127.0.0.1"},
	}
	repo := &ExternalModelsRepository{}
	resp, err := repo.VerifyExternalModel(
		slog.Default(),
		context.Background(),
		client,
		nil,
		models.VerifyExternalModelRequest{
			ModelID:     "my-model",
			BaseURL:     "http://my-model.test-namespace.svc.cluster.local:" + serverURL.Port(),
			SecretValue: "test-key",
			ModelType:   models.ModelTypeLLM,
		},
		"test-namespace",
		nil,
		false,
	)
	require.NoError(t, err)
	assert.True(t, resp.Success)
	assert.Equal(t, "my-model", client.gotName)
	assert.Equal(t, "test-namespace", client.gotNamespace)
}

// TestVerifyExternalModelCrossNamespaceServiceBlocked verifies that a service
// DNS name outside the caller's authorized namespace is never trusted: the
// backing Service is not looked up and the request does not reach it.
func TestVerifyExternalModelCrossNamespaceServiceBlocked(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		t.Error("cross-namespace destination must not be contacted")
	}))
	defer server.Close()
	serverURL, err := url.Parse(server.URL)
	require.NoError(t, err)

	client := &stubK8sClient{}
	repo := &ExternalModelsRepository{}
	_, err = repo.VerifyExternalModel(
		slog.Default(),
		context.Background(),
		client,
		nil,
		models.VerifyExternalModelRequest{
			ModelID:     "victim",
			BaseURL:     "http://victim.other-namespace.svc.cluster.local:" + serverURL.Port(),
			SecretValue: "test-key",
			ModelType:   models.ModelTypeLLM,
		},
		"test-namespace",
		nil,
		false,
	)
	require.Error(t, err)
	assert.Empty(t, client.gotName, "the cross-namespace Service must not be looked up")
}
