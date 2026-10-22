package kubernetes

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// TestTokenKubernetesClientGetNamespacesUsesProjectsWithoutNamespaceGets verifies the
// regular-user fallback: when the cluster-wide Namespace list is forbidden, namespaces
// come from the OpenShift Projects API without one Namespace GET per visible Project.
func TestTokenKubernetesClientGetNamespacesUsesProjectsWithoutNamespaceGets(t *testing.T) {
	var namespaceListRequests, projectListRequests, namespaceGetRequests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/api/v1/namespaces":
			namespaceListRequests.Add(1)
			http.Error(w, "forbidden", http.StatusForbidden)
		case r.URL.Path == "/apis/project.openshift.io/v1/projects":
			projectListRequests.Add(1)
			if auth := r.Header.Get("Authorization"); auth != "Bearer user-token" {
				t.Errorf("projects list authorization = %q, want the user token", auth)
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"apiVersion": "project.openshift.io/v1",
				"kind":       "ProjectList",
				"items": []map[string]any{
					{
						"apiVersion": "project.openshift.io/v1",
						"kind":       "Project",
						"metadata": map[string]any{
							"name": "tenant-a",
							"annotations": map[string]any{
								"openshift.io/display-name": "Tenant A",
							},
						},
					},
					{
						"apiVersion": "project.openshift.io/v1",
						"kind":       "Project",
						"metadata":   map[string]any{"name": "tenant-b"},
					},
				},
			})
		case strings.HasPrefix(r.URL.Path, "/api/v1/namespaces/"):
			// One GET per project is the N+1 this fix removes.
			namespaceGetRequests.Add(1)
			http.Error(w, "unexpected namespace get", http.StatusInternalServerError)
		default:
			t.Errorf("unexpected Kubernetes request: %s", r.URL.Path)
			http.Error(w, "unexpected request", http.StatusInternalServerError)
		}
	}))
	defer server.Close()

	cfg := &rest.Config{Host: server.URL, BearerToken: "user-token"}
	clientset, err := kubernetes.NewForConfig(cfg)
	require.NoError(t, err)

	kc := &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client: clientset,
			Logger: slog.Default(),
		},
		restConfig: cfg,
	}

	namespaces, err := kc.GetNamespaces(context.Background(), nil)

	require.NoError(t, err)
	require.Len(t, namespaces, 2)
	assert.Equal(t, "tenant-a", namespaces[0].Name)
	assert.Equal(t, "Tenant A", namespaces[0].Annotations["openshift.io/display-name"])
	assert.Equal(t, "tenant-b", namespaces[1].Name)
	assert.Equal(t, int32(1), namespaceListRequests.Load())
	assert.Equal(t, int32(1), projectListRequests.Load())
	assert.Zero(t, namespaceGetRequests.Load(), "per-project Namespace GETs must not regress")
}
