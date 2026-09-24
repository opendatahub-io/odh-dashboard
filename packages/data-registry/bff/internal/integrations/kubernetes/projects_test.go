package kubernetes

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"testing"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	kubernetesfake "k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"
)

func TestTokenKubernetesClientGetNamespacesUsesVisibleProjectsWhenNamespaceListIsForbidden(t *testing.T) {
	projectObjects := []runtime.Object{
		&unstructured.Unstructured{Object: map[string]interface{}{
			"apiVersion": "project.openshift.io/v1",
			"kind":       "Project",
			"metadata": map[string]interface{}{
				"name": "visible-project",
			},
		}},
		&unstructured.Unstructured{Object: map[string]interface{}{
			"apiVersion": "project.openshift.io/v1",
			"kind":       "Project",
			"metadata": map[string]interface{}{
				"labels": map[string]interface{}{
					"dataregistry.opendatahub.io/enabled": "true",
				},
				"name": "data-registry-system",
			},
		}},
	}

	dynamicClient := dynamicfake.NewSimpleDynamicClient(runtime.NewScheme(), projectObjects...)
	clientset := kubernetesfake.NewSimpleClientset()
	clientset.PrependReactor("list", "namespaces", func(action k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewForbidden(schema.GroupResource{Resource: "namespaces"}, "", nil)
	})

	client := &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client:        clientset,
			DynamicClient: dynamicClient,
			Logger:        slog.Default(),
		},
	}

	namespaces, err := client.GetNamespaces(context.Background(), nil)
	if err != nil {
		t.Fatalf("GetNamespaces() returned an error: %v", err)
	}

	if len(namespaces) != 2 {
		t.Fatalf("GetNamespaces() = %#v, want all visible projects", namespaces)
	}

	names := map[string]bool{}
	for _, namespace := range namespaces {
		names[namespace.Name] = true
	}
	if !names["visible-project"] || !names["data-registry-system"] {
		t.Fatalf("GetNamespaces() = %#v, want all visible projects", namespaces)
	}
}

func TestImpersonationRoundTripperSetsRequestIdentityHeaders(t *testing.T) {
	base := roundTripperFunc(func(req *http.Request) (*http.Response, error) {
		if got := req.Header.Get("Impersonate-User"); got != "alice@example.com" {
			t.Errorf("Impersonate-User = %q, want %q", got, "alice@example.com")
		}
		if got := req.Header.Values("Impersonate-Group"); len(got) != 2 || got[0] != "team-a" || got[1] != "system:authenticated" {
			t.Errorf("Impersonate-Group = %#v, want %#v", got, []string{"team-a", "system:authenticated"})
		}
		if got := req.Header.Get("Impersonate-Uid"); got != "" {
			t.Errorf("Impersonate-Uid = %q, want empty", got)
		}

		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader("")),
			Request:    req,
		}, nil
	})

	req, err := http.NewRequest(http.MethodGet, "https://kubernetes.example/api", nil)
	if err != nil {
		t.Fatal(err)
	}
	req = req.WithContext(ContextWithIdentity(req.Context(), &RequestIdentity{
		UserID: "alice@example.com",
		Groups: []string{"team-a", "system:authenticated"},
	}))

	if _, err := (&impersonationRoundTripper{base: base}).RoundTrip(req); err != nil {
		t.Fatalf("RoundTrip() returned an error: %v", err)
	}
}

func TestImpersonationRoundTripperRequiresIdentity(t *testing.T) {
	called := false
	base := roundTripperFunc(func(req *http.Request) (*http.Response, error) {
		called = true
		return nil, nil
	})

	req, err := http.NewRequest(http.MethodGet, "https://kubernetes.example/api", nil)
	if err != nil {
		t.Fatal(err)
	}

	if _, err := (&impersonationRoundTripper{base: base}).RoundTrip(req); err == nil {
		t.Fatal("RoundTrip() returned nil error without identity")
	}
	if called {
		t.Fatal("base transport was called without identity")
	}
}

type roundTripperFunc func(*http.Request) (*http.Response, error)

func (f roundTripperFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}
