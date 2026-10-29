package repositories

import (
	"context"
	"fmt"
	"log/slog"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// TestIsInternalHost verifies that SSRF validation is only skipped for localhost/loopback
// and for in-cluster services in the caller's authorized namespace. Cross-namespace and
// external hosts must NOT be treated as internal (CWE-918).
func TestIsInternalHost(t *testing.T) {
	tests := []struct {
		name             string
		baseURL          string
		allowedNamespace string
		want             bool
	}{
		{"same-namespace cluster service is trusted", "https://my-model.my-ns.svc.cluster.local:8443/v1", "my-ns", true},
		{"same-namespace cluster service on arbitrary port", "http://model.my-ns.svc.cluster.local:19530", "my-ns", true},
		{"cross-namespace cluster service is NOT trusted", "https://secret.kube-system.svc.cluster.local/v1", "my-ns", false},
		{"namespace-like service name does not match", "https://my-ns.other-ns.svc.cluster.local/v1", "my-ns", false},
		{"cluster service with empty authorized namespace is NOT trusted", "https://svc.my-ns.svc.cluster.local", "", false},
		{"localhost is trusted", "http://localhost:8080", "my-ns", true},
		{"loopback IP is trusted", "http://127.0.0.1:9000", "my-ns", true},
		{"private IP is not internal", "http://10.0.0.5:8080", "my-ns", false},
		{"external host is not internal", "https://api.openai.com/v1", "my-ns", false},
		{"lookalike cluster suffix is not internal", "https://evil.cluster.local", "my-ns", false},
		{"too-few labels is not internal", "https://svc.cluster.local", "my-ns", false},
		{"unparseable url is not internal", "://bad-url", "my-ns", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isInternalHost(tt.baseURL, tt.allowedNamespace); got != tt.want {
				t.Errorf("isInternalHost(%q, %q) = %v, want %v", tt.baseURL, tt.allowedNamespace, got, tt.want)
			}
		})
	}
}

// TestResolveTrustedHost verifies the Service-backed trust decision: an in-namespace
// service DNS name is only trusted when the backing Service exists and is not an
// ExternalName alias (which could point at another namespace).
func TestResolveTrustedHost(t *testing.T) {
	logger := slog.Default()
	baseURL := "https://my-model.my-ns.svc.cluster.local:8443/v1"

	tests := []struct {
		name    string
		service *corev1.Service
		err     error
		want    bool
	}{
		{
			name: "selector-backed ClusterIP service is trusted",
			service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeClusterIP, Selector: map[string]string{"app": "my-model"}},
			},
			want: true,
		},
		{
			name: "ExternalName alias is NOT trusted",
			service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeExternalName, ExternalName: "secret.other-ns.svc.cluster.local"},
			},
			want: false,
		},
		{
			name: "service lookup failure is NOT trusted",
			err:  fmt.Errorf("forbidden"),
			want: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := &k8smocks.ConfigurableMockKubernetesClient{Service: tt.service, ServiceError: tt.err}
			if got := resolveTrustedHost(context.Background(), client, nil, baseURL, "my-ns", logger); got != tt.want {
				t.Errorf("resolveTrustedHost() = %v, want %v", got, tt.want)
			}
		})
	}
}
