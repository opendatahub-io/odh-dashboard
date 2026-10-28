package repositories

import (
	"context"
	"fmt"
	"reflect"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
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

// stubK8sClient stubs GetService; all other interface methods are unused by these tests.
type stubK8sClient struct {
	kubernetes.KubernetesClientInterface
	service *corev1.Service
	err     error
}

func (s *stubK8sClient) GetService(ctx context.Context, namespace string, name string) (*corev1.Service, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.service, nil
}

func TestResolveTrustedHost(t *testing.T) {
	tests := []struct {
		name          string
		baseURL       string
		namespace     string
		service       *corev1.Service
		getServiceErr error
		wantTrusted   bool
		wantIPs       []string
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
			name:      "in-namespace ClusterIP service is trusted with its ClusterIP pinned",
			baseURL:   "https://my-model.test-namespace.svc.cluster.local:8080/v1",
			namespace: "test-namespace",
			service: &corev1.Service{
				Spec: corev1.ServiceSpec{
					Type:       corev1.ServiceTypeClusterIP,
					ClusterIP:  "10.96.10.5",
					ClusterIPs: []string{"10.96.10.5"},
				},
			},
			wantTrusted: true,
			wantIPs:     []string{"10.96.10.5"},
		},
		{
			name:      "in-namespace headless service is trusted without pinned IPs",
			baseURL:   "https://my-model.test-namespace.svc.cluster.local:8080/v1",
			namespace: "test-namespace",
			service: &corev1.Service{
				Spec: corev1.ServiceSpec{
					Type:      corev1.ServiceTypeClusterIP,
					ClusterIP: "None",
				},
			},
			wantTrusted: true,
		},
		{
			name:          "unresolvable service name is not trusted",
			baseURL:       "https://gone.test-namespace.svc.cluster.local:8080/v1",
			namespace:     "test-namespace",
			getServiceErr: fmt.Errorf("not found"),
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
			client := &stubK8sClient{service: tt.service, err: tt.getServiceErr}
			trusted, ips := resolveTrustedHost(context.Background(), client, tt.baseURL, tt.namespace)
			if trusted != tt.wantTrusted {
				t.Errorf("resolveTrustedHost(%q, %q) trusted = %v, want %v", tt.baseURL, tt.namespace, trusted, tt.wantTrusted)
			}
			if !reflect.DeepEqual(ips, tt.wantIPs) {
				t.Errorf("resolveTrustedHost(%q, %q) ips = %v, want %v", tt.baseURL, tt.namespace, ips, tt.wantIPs)
			}
		})
	}
}
