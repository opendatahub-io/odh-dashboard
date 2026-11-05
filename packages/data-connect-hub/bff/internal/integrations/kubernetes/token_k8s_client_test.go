package kubernetes

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

func TestNamespacesFromProjects(t *testing.T) {
	tests := []struct {
		name      string
		projects  []unstructured.Unstructured
		wantNames []string
		wantError bool
	}{
		{
			name: "returns accessible project names",
			projects: []unstructured.Unstructured{
				{Object: map[string]interface{}{
					"metadata": map[string]interface{}{"name": "test-project"},
				}},
			},
			wantNames: []string{"test-project"},
		},
		{
			name:      "returns no namespaces for no projects",
			wantNames: []string{},
		},
		{
			name: "errors when a project has no name",
			projects: []unstructured.Unstructured{
				{Object: map[string]interface{}{"metadata": map[string]interface{}{}}},
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			namespaces, err := namespacesFromProjects(tt.projects)

			if tt.wantError {
				if err == nil {
					t.Fatal("expected an error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			var gotNames []string
			for _, namespace := range namespaces {
				gotNames = append(gotNames, namespace.Name)
			}
			if len(gotNames) != len(tt.wantNames) {
				t.Fatalf("namespace count = %d, want %d", len(gotNames), len(tt.wantNames))
			}
			for i, wantName := range tt.wantNames {
				if gotNames[i] != wantName {
					t.Fatalf("namespace name[%d] = %q, want %q", i, gotNames[i], wantName)
				}
			}
		})
	}
}

func TestTokenKubernetesClientGetNamespacesUsesCoreNamespaces(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/namespaces" {
			t.Errorf("unexpected Kubernetes request: %s", r.URL.Path)
			http.Error(w, "unexpected request", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(corev1.NamespaceList{
			TypeMeta: metav1.TypeMeta{Kind: "NamespaceList", APIVersion: "v1"},
			Items: []corev1.Namespace{{
				ObjectMeta: metav1.ObjectMeta{Name: "cluster-namespace"},
			}},
		})
	}))
	defer server.Close()

	cfg := &rest.Config{Host: server.URL, BearerToken: "user-token"}
	clientset, err := kubernetes.NewForConfig(cfg)
	require.NoError(t, err)
	kc := &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{Client: clientset, Logger: slog.Default()},
		restConfig:        cfg,
	}

	namespaces, err := kc.GetNamespaces(context.Background(), nil)

	require.NoError(t, err)
	require.Len(t, namespaces, 1)
	assert.Equal(t, "cluster-namespace", namespaces[0].Name)
}

func TestTokenKubernetesClientGetNamespacesFallsBackToProjects(t *testing.T) {
	tests := []struct {
		name            string
		namespaceStatus int
		projectsStatus  int
		wantErr         bool
		wantNames       []string
	}{
		{
			name:            "falls back to accessible projects",
			namespaceStatus: http.StatusForbidden,
			wantNames:       []string{"tenant-a"},
		},
		{
			name:            "returns an error for a non-forbidden namespace failure",
			namespaceStatus: http.StatusInternalServerError,
			wantErr:         true,
		},
		{
			name:            "returns an error when the projects request fails",
			namespaceStatus: http.StatusForbidden,
			projectsStatus:  http.StatusInternalServerError,
			wantErr:         true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if authorization := r.Header.Get("Authorization"); authorization != "Bearer user-token" {
					t.Errorf("Authorization header = %q, want %q", authorization, "Bearer user-token")
				}
				switch r.URL.Path {
				case "/api/v1/namespaces":
					http.Error(w, "namespace request failed", tt.namespaceStatus)
				case "/apis/project.openshift.io/v1/projects":
					if tt.projectsStatus != 0 {
						http.Error(w, "projects request failed", tt.projectsStatus)
						return
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
						},
					})
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
				SharedClientLogic: SharedClientLogic{Client: clientset, Logger: slog.Default()},
				restConfig:        cfg,
			}

			namespaces, err := kc.GetNamespaces(context.Background(), nil)

			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			require.Len(t, namespaces, len(tt.wantNames))
			for index, wantName := range tt.wantNames {
				assert.Equal(t, wantName, namespaces[index].Name)
			}
			if len(namespaces) > 0 {
				assert.Equal(t, "Tenant A", namespaces[0].Annotations["openshift.io/display-name"])
			}
		})
	}
}
