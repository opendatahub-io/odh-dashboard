package kubernetes

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
)

func TestTokenKubernetesClientUsesServiceAccountForKueueDiscovery(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if authorization := r.Header.Get("Authorization"); authorization != "Bearer service-account-token" {
			t.Errorf("discovery authorization = %q, want service account token", authorization)
			http.Error(w, "wrong Kubernetes identity", http.StatusForbidden)
			return
		}
		requests.Add(1)
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/v1/namespaces/rbac-discovery-test":
			fmt.Fprint(w, `{"apiVersion":"v1","kind":"Namespace","metadata":{"name":"rbac-discovery-test"}}`)
		case "/apis/kueue.openshift.io/v1/kueues":
			fmt.Fprint(w, `{"apiVersion":"kueue.openshift.io/v1","kind":"KueueList","items":[]}`)
		case "/apis/datasciencecluster.opendatahub.io/v2/datascienceclusters":
			fmt.Fprint(w, `{"apiVersion":"datasciencecluster.opendatahub.io/v2","kind":"DataScienceClusterList","items":[]}`)
		default:
			t.Errorf("unexpected Kubernetes request: %s", r.URL.Path)
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	kubeconfig := fmt.Sprintf(`apiVersion: v1
kind: Config
clusters:
- cluster:
    insecure-skip-tls-verify: true
    server: %s
  name: test
contexts:
- context:
    cluster: test
    user: service-account
  name: test
current-context: test
users:
- name: service-account
  user:
    token: service-account-token
`, server.URL)
	kubeconfigPath := filepath.Join(t.TempDir(), "kubeconfig")
	if err := os.WriteFile(kubeconfigPath, []byte(kubeconfig), 0o600); err != nil {
		t.Fatalf("write kubeconfig: %v", err)
	}
	t.Setenv("KUBECONFIG", kubeconfigPath)

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	client, err := NewTokenKubernetesClient("tenant-token", logger)
	if err != nil {
		t.Fatalf("create tenant client: %v", err)
	}
	if configToken := client.(*TokenKubernetesClient).discoveryConfig.BearerToken; configToken != "service-account-token" {
		t.Fatalf("discovery config token = %q, want service account token", configToken)
	}
	if _, err := client.GetKueueAvailability(context.Background(), nil, "rbac-discovery-test"); err != nil {
		t.Fatalf("get Kueue availability: %v", err)
	}
	if requests.Load() != 3 {
		t.Fatalf("Kubernetes requests = %d, want 3", requests.Load())
	}
}
