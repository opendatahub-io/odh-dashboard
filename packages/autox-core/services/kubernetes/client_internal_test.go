package kubernetes

import (
	"context"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"testing"

	authorizationv1 "k8s.io/api/authorization/v1"
	v1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"
)

func newInternalClientWithFakes(objects ...runtime.Object) (Client, *fake.Clientset, *dynamicfake.FakeDynamicClient) {
	cs := fake.NewSimpleClientset(objects...)
	dc := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), testListKinds)
	client := NewInternalClient(cs, dc)
	return client, cs, dc
}

// --- impersonationRoundTripper tests ---

func TestImpersonationRoundTripper(t *testing.T) {
	t.Run("sets impersonation headers", func(t *testing.T) {
		var gotHeaders http.Header
		base := roundTripperFunc(func(req *http.Request) (*http.Response, error) {
			gotHeaders = req.Header.Clone()
			return &http.Response{StatusCode: 200}, nil
		})

		rt := &impersonationRoundTripper{base: base}
		ctx := ContextWithIdentity(context.Background(), &RequestIdentity{
			UserID: "alice",
			Groups: []string{"devs", "admins"},
		})
		req, _ := http.NewRequestWithContext(ctx, "GET", "https://k8s.example.com/api", nil)

		_, err := rt.RoundTrip(req)
		if err != nil {
			t.Fatal(err)
		}

		if gotHeaders.Get("Impersonate-User") != "alice" {
			t.Errorf("Impersonate-User = %q, want %q", gotHeaders.Get("Impersonate-User"), "alice")
		}

		groups := gotHeaders.Values("Impersonate-Group")
		if len(groups) != 2 || groups[0] != "devs" || groups[1] != "admins" {
			t.Errorf("Impersonate-Group = %v, want [devs admins]", groups)
		}
	})

	t.Run("missing identity", func(t *testing.T) {
		rt := &impersonationRoundTripper{base: roundTripperFunc(func(req *http.Request) (*http.Response, error) {
			t.Fatal("base should not be called")
			return nil, nil
		})}
		req, _ := http.NewRequestWithContext(context.Background(), "GET", "https://k8s.example.com/api", nil)

		_, err := rt.RoundTrip(req)
		if err == nil {
			t.Error("expected error for missing identity")
		}
	})

	t.Run("empty UserID", func(t *testing.T) {
		rt := &impersonationRoundTripper{base: roundTripperFunc(func(req *http.Request) (*http.Response, error) {
			t.Fatal("base should not be called")
			return nil, nil
		})}
		ctx := ContextWithIdentity(context.Background(), &RequestIdentity{UserID: ""})
		req, _ := http.NewRequestWithContext(ctx, "GET", "https://k8s.example.com/api", nil)

		_, err := rt.RoundTrip(req)
		if err == nil {
			t.Error("expected error for empty UserID")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Errorf("expected *ValidationError, got %T: %v", err, err)
		}
	})

	t.Run("does not mutate original request", func(t *testing.T) {
		base := roundTripperFunc(func(req *http.Request) (*http.Response, error) {
			return &http.Response{StatusCode: 200}, nil
		})

		rt := &impersonationRoundTripper{base: base}
		ctx := ContextWithIdentity(context.Background(), &RequestIdentity{UserID: "alice"})
		req, _ := http.NewRequestWithContext(ctx, "GET", "https://k8s.example.com/api", nil)

		_, err := rt.RoundTrip(req)
		if err != nil {
			t.Fatal(err)
		}
		if req.Header.Get("Impersonate-User") != "" {
			t.Error("original request should not have Impersonate-User header")
		}
	})

	t.Run("no groups", func(t *testing.T) {
		var gotHeaders http.Header
		base := roundTripperFunc(func(req *http.Request) (*http.Response, error) {
			gotHeaders = req.Header.Clone()
			return &http.Response{StatusCode: 200}, nil
		})

		rt := &impersonationRoundTripper{base: base}
		ctx := ContextWithIdentity(context.Background(), &RequestIdentity{UserID: "bob"})
		req, _ := http.NewRequestWithContext(ctx, "GET", "https://k8s.example.com/api", nil)

		_, err := rt.RoundTrip(req)
		if err != nil {
			t.Fatal(err)
		}

		if gotHeaders.Get("Impersonate-User") != "bob" {
			t.Errorf("Impersonate-User = %q, want %q", gotHeaders.Get("Impersonate-User"), "bob")
		}
		if len(gotHeaders.Values("Impersonate-Group")) != 0 {
			t.Errorf("expected no Impersonate-Group headers, got %v", gotHeaders.Values("Impersonate-Group"))
		}
	})
}

// --- saTokenRoundTripper tests ---

func TestSATokenRoundTripper(t *testing.T) {
	t.Run("uses static token", func(t *testing.T) {
		var gotAuth string
		base := roundTripperFunc(func(req *http.Request) (*http.Response, error) {
			gotAuth = req.Header.Get("Authorization")
			return &http.Response{StatusCode: 200}, nil
		})

		rt := &saTokenRoundTripper{base: base, token: "static-token"}
		req, _ := http.NewRequestWithContext(context.Background(), "GET", "https://k8s.example.com/api", nil)

		_, err := rt.RoundTrip(req)
		if err != nil {
			t.Fatal(err)
		}
		if gotAuth != "Bearer static-token" {
			t.Errorf("Authorization = %q, want %q", gotAuth, "Bearer static-token")
		}
	})

	t.Run("prefers token file over static", func(t *testing.T) {
		tmpDir := t.TempDir()
		tokenFile := filepath.Join(tmpDir, "token")
		if err := os.WriteFile(tokenFile, []byte("  file-token  \n"), 0600); err != nil {
			t.Fatal(err)
		}

		var gotAuth string
		base := roundTripperFunc(func(req *http.Request) (*http.Response, error) {
			gotAuth = req.Header.Get("Authorization")
			return &http.Response{StatusCode: 200}, nil
		})

		rt := &saTokenRoundTripper{base: base, token: "static-token", tokenFile: tokenFile}
		req, _ := http.NewRequestWithContext(context.Background(), "GET", "https://k8s.example.com/api", nil)

		_, err := rt.RoundTrip(req)
		if err != nil {
			t.Fatal(err)
		}
		if gotAuth != "Bearer file-token" {
			t.Errorf("Authorization = %q, want %q", gotAuth, "Bearer file-token")
		}
	})

	t.Run("falls back to static when file missing", func(t *testing.T) {
		var gotAuth string
		base := roundTripperFunc(func(req *http.Request) (*http.Response, error) {
			gotAuth = req.Header.Get("Authorization")
			return &http.Response{StatusCode: 200}, nil
		})

		rt := &saTokenRoundTripper{base: base, token: "static-token", tokenFile: "/nonexistent/path"}
		req, _ := http.NewRequestWithContext(context.Background(), "GET", "https://k8s.example.com/api", nil)

		_, err := rt.RoundTrip(req)
		if err != nil {
			t.Fatal(err)
		}
		if gotAuth != "Bearer static-token" {
			t.Errorf("Authorization = %q, want %q", gotAuth, "Bearer static-token")
		}
	})

	t.Run("empty token errors", func(t *testing.T) {
		rt := &saTokenRoundTripper{base: roundTripperFunc(func(req *http.Request) (*http.Response, error) {
			t.Fatal("base should not be called")
			return nil, nil
		})}
		req, _ := http.NewRequestWithContext(context.Background(), "GET", "https://k8s.example.com/api", nil)

		_, err := rt.RoundTrip(req)
		if err == nil {
			t.Error("expected error for empty token")
		}
	})
}

// --- internalClient operation tests ---

func TestInternalClient_GetUser(t *testing.T) {
	t.Run("returns UserID from context", func(t *testing.T) {
		client, _, _ := newInternalClientWithFakes()
		ctx := ContextWithIdentity(context.Background(), &RequestIdentity{UserID: "alice"})

		user, err := client.GetUser(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if user != "alice" {
			t.Errorf("user = %q, want %q", user, "alice")
		}
	})

	t.Run("missing identity", func(t *testing.T) {
		client, _, _ := newInternalClientWithFakes()
		_, err := client.GetUser(context.Background())
		if err == nil {
			t.Error("expected error for missing identity")
		}
	})
}

func TestInternalClient_GetNamespaces(t *testing.T) {
	t.Run("lists from core API", func(t *testing.T) {
		client, _, _ := newInternalClientWithFakes(
			&v1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "ns1"}},
		)

		namespaces, err := client.GetNamespaces(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		if len(namespaces) != 1 {
			t.Errorf("expected 1 namespace, got %d", len(namespaces))
		}
	})

	t.Run("falls back to projects API on forbidden", func(t *testing.T) {
		client, cs, dc := newInternalClientWithFakes()

		cs.PrependReactor("list", "namespaces", func(action k8stesting.Action) (bool, runtime.Object, error) {
			return true, nil, k8serrors.NewForbidden(schema.GroupResource{Resource: "namespaces"}, "", nil)
		})

		dc.PrependReactor("list", "projects", func(action k8stesting.Action) (bool, runtime.Object, error) {
			return true, &unstructured.UnstructuredList{
				Object: map[string]interface{}{"apiVersion": "project.openshift.io/v1", "kind": "ProjectList"},
				Items: []unstructured.Unstructured{
					{Object: map[string]interface{}{
						"apiVersion": "project.openshift.io/v1",
						"kind":       "Project",
						"metadata":   map[string]interface{}{"name": "proj1"},
					}},
				},
			}, nil
		})

		cs.PrependReactor("get", "namespaces", func(action k8stesting.Action) (bool, runtime.Object, error) {
			return true, nil, k8serrors.NewNotFound(schema.GroupResource{Resource: "namespaces"}, "proj1")
		})

		namespaces, err := client.GetNamespaces(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		if len(namespaces) != 1 || namespaces[0].Name != "proj1" {
			t.Errorf("expected [proj1], got %v", namespaces)
		}
	})
}

func TestInternalClient_IsClusterAdmin(t *testing.T) {
	client, cs, _ := newInternalClientWithFakes()
	cs.PrependReactor("create", "selfsubjectaccessreviews", func(action k8stesting.Action) (bool, runtime.Object, error) {
		return true, &authorizationv1.SelfSubjectAccessReview{
			Status: authorizationv1.SubjectAccessReviewStatus{Allowed: true},
		}, nil
	})

	isAdmin, err := client.IsClusterAdmin(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if !isAdmin {
		t.Error("expected true")
	}
}

func TestInternalClient_CanAccessResource(t *testing.T) {
	client, cs, _ := newInternalClientWithFakes()
	cs.PrependReactor("create", "selfsubjectaccessreviews", func(action k8stesting.Action) (bool, runtime.Object, error) {
		createAction := action.(k8stesting.CreateAction)
		sar := createAction.GetObject().(*authorizationv1.SelfSubjectAccessReview)
		allowed := sar.Spec.ResourceAttributes.Verb == "get"
		return true, &authorizationv1.SelfSubjectAccessReview{
			Status: authorizationv1.SubjectAccessReviewStatus{Allowed: allowed},
		}, nil
	})

	can, err := client.CanAccessResource(context.Background(), "ns1", "get", "", "pods", "")
	if err != nil {
		t.Fatal(err)
	}
	if !can {
		t.Error("expected true for get")
	}

	can, err = client.CanAccessResource(context.Background(), "ns1", "delete", "", "pods", "")
	if err != nil {
		t.Fatal(err)
	}
	if can {
		t.Error("expected false for delete")
	}
}

func TestInternalClient_DiscoverResourceGVR(t *testing.T) {
	client, _, dc := newInternalClientWithFakes()

	dc.PrependReactor("list", "*", func(action k8stesting.Action) (bool, runtime.Object, error) {
		listAction := action.(k8stesting.ListAction)
		gvr := listAction.GetResource()
		if gvr.Version == "v1beta1" {
			return true, &unstructured.UnstructuredList{}, nil
		}
		return true, nil, k8serrors.NewNotFound(schema.GroupResource{Resource: gvr.Resource}, "")
	})

	gvr, err := client.DiscoverResourceGVR(context.Background(), "serving.kserve.io", "inferenceservices", "ns1", []string{"v1", "v1beta1"})
	if err != nil {
		t.Fatal(err)
	}
	if gvr.Version != "v1beta1" {
		t.Errorf("Version = %q, want %q", gvr.Version, "v1beta1")
	}
}

func TestInternalClient_GetSecrets(t *testing.T) {
	client, _, _ := newInternalClientWithFakes(
		&v1.Secret{ObjectMeta: metav1.ObjectMeta{Name: "s1", Namespace: "ns1"}},
		&v1.Secret{ObjectMeta: metav1.ObjectMeta{Name: "s2", Namespace: "ns1"}},
	)

	secrets, err := client.GetSecrets(context.Background(), "ns1")
	if err != nil {
		t.Fatal(err)
	}
	if len(secrets) != 2 {
		t.Errorf("expected 2 secrets, got %d", len(secrets))
	}
}

func TestInternalClient_GetSecret(t *testing.T) {
	client, _, _ := newInternalClientWithFakes(
		&v1.Secret{ObjectMeta: metav1.ObjectMeta{Name: "my-secret", Namespace: "ns1"}},
	)

	secret, err := client.GetSecret(context.Background(), "ns1", "my-secret")
	if err != nil {
		t.Fatal(err)
	}
	if secret.Name != "my-secret" {
		t.Errorf("Name = %q, want %q", secret.Name, "my-secret")
	}
}

func TestInternalClient_GetPods(t *testing.T) {
	client, _, _ := newInternalClientWithFakes(
		&v1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "pod1", Namespace: "ns1"}},
	)

	pods, err := client.GetPods(context.Background(), "ns1")
	if err != nil {
		t.Fatal(err)
	}
	if len(pods.Items) != 1 {
		t.Errorf("expected 1 pod, got %d", len(pods.Items))
	}
}

func TestInternalClient_ListResources(t *testing.T) {
	client, _, dc := newInternalClientWithFakes()
	gvr := schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}

	dc.PrependReactor("list", "deployments", func(action k8stesting.Action) (bool, runtime.Object, error) {
		return true, &unstructured.UnstructuredList{
			Object: map[string]interface{}{"apiVersion": "apps/v1", "kind": "DeploymentList"},
			Items: []unstructured.Unstructured{
				{Object: map[string]interface{}{"apiVersion": "apps/v1", "kind": "Deployment", "metadata": map[string]interface{}{"name": "d1", "namespace": "ns1"}}},
			},
		}, nil
	})

	list, err := client.ListResources(context.Background(), gvr, "ns1")
	if err != nil {
		t.Fatal(err)
	}
	if len(list.Items) != 1 {
		t.Errorf("expected 1 item, got %d", len(list.Items))
	}
}

func TestNewBearerTokenRoundTripper(t *testing.T) {
	var gotAuth string
	base := roundTripperFunc(func(req *http.Request) (*http.Response, error) {
		gotAuth = req.Header.Get("Authorization")
		return &http.Response{StatusCode: 200}, nil
	})

	rt := NewBearerTokenRoundTripper(base)
	ctx := ContextWithIdentity(context.Background(), &RequestIdentity{Token: "test-token"})
	req, _ := http.NewRequestWithContext(ctx, "GET", "https://k8s.example.com/api", nil)

	_, err := rt.RoundTrip(req)
	if err != nil {
		t.Fatal(err)
	}
	if gotAuth != "Bearer test-token" {
		t.Errorf("Authorization = %q, want %q", gotAuth, "Bearer test-token")
	}
}
