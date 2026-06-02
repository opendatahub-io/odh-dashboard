package kubernetes

import (
	"context"
	"net/http"
	"testing"

	authenticationv1 "k8s.io/api/authentication/v1"
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

var testListKinds = map[schema.GroupVersionResource]string{
	{Group: "project.openshift.io", Version: "v1", Resource: "projects"}:       "ProjectList",
	{Group: "serving.kserve.io", Version: "v1", Resource: "inferenceservices"}: "InferenceServiceList",
	{Group: "serving.kserve.io", Version: "v1beta1", Resource: "inferenceservices"}: "InferenceServiceList",
	{Group: "serving.kserve.io", Version: "v1alpha1", Resource: "inferenceservices"}: "InferenceServiceList",
	{Group: "apps", Version: "v1", Resource: "deployments"}:    "DeploymentList",
	{Group: "apps", Version: "v1beta1", Resource: "deployments"}: "DeploymentList",
	{Group: "", Version: "v1", Resource: "nodes"}:               "NodeList",
}

func newTokenClientWithFakes(objects ...runtime.Object) (Client, *fake.Clientset, *dynamicfake.FakeDynamicClient) {
	cs := fake.NewSimpleClientset(objects...)
	dc := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), testListKinds)
	client := NewTokenClient(cs, dc)
	return client, cs, dc
}

// --- tokenRoundTripper tests ---

func TestTokenRoundTripper(t *testing.T) {
	t.Run("injects bearer token", func(t *testing.T) {
		var gotAuth string
		base := roundTripperFunc(func(req *http.Request) (*http.Response, error) {
			gotAuth = req.Header.Get("Authorization")
			return &http.Response{StatusCode: 200}, nil
		})

		rt := &tokenRoundTripper{base: base}
		ctx := ContextWithIdentity(context.Background(), &RequestIdentity{Token: "my-token"})
		req, _ := http.NewRequestWithContext(ctx, "GET", "https://k8s.example.com/api/v1/pods", nil)

		_, err := rt.RoundTrip(req)
		if err != nil {
			t.Fatal(err)
		}
		if gotAuth != "Bearer my-token" {
			t.Errorf("Authorization = %q, want %q", gotAuth, "Bearer my-token")
		}
	})

	t.Run("missing identity", func(t *testing.T) {
		rt := &tokenRoundTripper{base: roundTripperFunc(func(req *http.Request) (*http.Response, error) {
			t.Fatal("base should not be called")
			return nil, nil
		})}
		req, _ := http.NewRequestWithContext(context.Background(), "GET", "https://k8s.example.com/api", nil)

		_, err := rt.RoundTrip(req)
		if err == nil {
			t.Error("expected error for missing identity")
		}
	})

	t.Run("empty token", func(t *testing.T) {
		rt := &tokenRoundTripper{base: roundTripperFunc(func(req *http.Request) (*http.Response, error) {
			t.Fatal("base should not be called")
			return nil, nil
		})}
		ctx := ContextWithIdentity(context.Background(), &RequestIdentity{Token: ""})
		req, _ := http.NewRequestWithContext(ctx, "GET", "https://k8s.example.com/api", nil)

		_, err := rt.RoundTrip(req)
		if err == nil {
			t.Error("expected error for empty token")
		}
	})

	t.Run("does not mutate original request", func(t *testing.T) {
		base := roundTripperFunc(func(req *http.Request) (*http.Response, error) {
			return &http.Response{StatusCode: 200}, nil
		})

		rt := &tokenRoundTripper{base: base}
		ctx := ContextWithIdentity(context.Background(), &RequestIdentity{Token: "tok"})
		req, _ := http.NewRequestWithContext(ctx, "GET", "https://k8s.example.com/api", nil)

		_, err := rt.RoundTrip(req)
		if err != nil {
			t.Fatal(err)
		}
		if req.Header.Get("Authorization") != "" {
			t.Error("original request should not have Authorization header")
		}
	})
}

// --- tokenClient operation tests ---

func TestTokenClient_GetNamespaces(t *testing.T) {
	t.Run("lists from core API", func(t *testing.T) {
		client, _, _ := newTokenClientWithFakes(
			&v1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "ns1"}},
			&v1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "ns2"}},
		)

		namespaces, err := client.GetNamespaces(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		if len(namespaces) != 2 {
			t.Errorf("expected 2 namespaces, got %d", len(namespaces))
		}
	})

	t.Run("falls back to projects API on forbidden", func(t *testing.T) {
		client, cs, dc := newTokenClientWithFakes()

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
			return true, nil, k8serrors.NewForbidden(schema.GroupResource{Resource: "namespaces"}, "proj1", nil)
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

func TestTokenClient_GetPods(t *testing.T) {
	client, _, _ := newTokenClientWithFakes(
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

func TestTokenClient_GetSecrets(t *testing.T) {
	client, _, _ := newTokenClientWithFakes(
		&v1.Secret{ObjectMeta: metav1.ObjectMeta{Name: "secret1", Namespace: "ns1"}},
	)

	secrets, err := client.GetSecrets(context.Background(), "ns1")
	if err != nil {
		t.Fatal(err)
	}
	if len(secrets) != 1 {
		t.Errorf("expected 1 secret, got %d", len(secrets))
	}
}

func TestTokenClient_GetSecret(t *testing.T) {
	client, _, _ := newTokenClientWithFakes(
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

func TestTokenClient_GetUser(t *testing.T) {
	t.Run("returns username from SSR", func(t *testing.T) {
		client, cs, _ := newTokenClientWithFakes()
		cs.PrependReactor("create", "selfsubjectreviews", func(action k8stesting.Action) (bool, runtime.Object, error) {
			return true, &authenticationv1.SelfSubjectReview{
				Status: authenticationv1.SelfSubjectReviewStatus{
					UserInfo: authenticationv1.UserInfo{Username: "alice"},
				},
			}, nil
		})

		user, err := client.GetUser(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		if user != "alice" {
			t.Errorf("user = %q, want %q", user, "alice")
		}
	})

	t.Run("empty username returns error", func(t *testing.T) {
		client, cs, _ := newTokenClientWithFakes()
		cs.PrependReactor("create", "selfsubjectreviews", func(action k8stesting.Action) (bool, runtime.Object, error) {
			return true, &authenticationv1.SelfSubjectReview{
				Status: authenticationv1.SelfSubjectReviewStatus{
					UserInfo: authenticationv1.UserInfo{Username: ""},
				},
			}, nil
		})

		_, err := client.GetUser(context.Background())
		if err == nil {
			t.Error("expected error for empty username")
		}
	})
}

func TestTokenClient_IsClusterAdmin(t *testing.T) {
	t.Run("allowed", func(t *testing.T) {
		client, cs, _ := newTokenClientWithFakes()
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
	})

	t.Run("denied", func(t *testing.T) {
		client, cs, _ := newTokenClientWithFakes()
		cs.PrependReactor("create", "selfsubjectaccessreviews", func(action k8stesting.Action) (bool, runtime.Object, error) {
			return true, &authorizationv1.SelfSubjectAccessReview{
				Status: authorizationv1.SubjectAccessReviewStatus{Allowed: false},
			}, nil
		})

		isAdmin, err := client.IsClusterAdmin(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		if isAdmin {
			t.Error("expected false")
		}
	})
}

func TestTokenClient_CanAccessResource(t *testing.T) {
	client, cs, _ := newTokenClientWithFakes()

	cs.PrependReactor("create", "selfsubjectaccessreviews", func(action k8stesting.Action) (bool, runtime.Object, error) {
		createAction := action.(k8stesting.CreateAction)
		sar := createAction.GetObject().(*authorizationv1.SelfSubjectAccessReview)
		allowed := sar.Spec.ResourceAttributes.Namespace == "allowed-ns"
		return true, &authorizationv1.SelfSubjectAccessReview{
			Status: authorizationv1.SubjectAccessReviewStatus{Allowed: allowed},
		}, nil
	})

	can, err := client.CanAccessResource(context.Background(), "allowed-ns", "get", "", "pods", "")
	if err != nil {
		t.Fatal(err)
	}
	if !can {
		t.Error("expected true for allowed-ns")
	}

	can, err = client.CanAccessResource(context.Background(), "denied-ns", "get", "", "pods", "")
	if err != nil {
		t.Fatal(err)
	}
	if can {
		t.Error("expected false for denied-ns")
	}
}

func TestTokenClient_DiscoverResourceGVR(t *testing.T) {
	t.Run("finds first available version", func(t *testing.T) {
		client, _, dc := newTokenClientWithFakes()
		callCount := 0
		dc.PrependReactor("list", "*", func(action k8stesting.Action) (bool, runtime.Object, error) {
			callCount++
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
	})

	t.Run("all versions not found", func(t *testing.T) {
		client, _, dc := newTokenClientWithFakes()
		dc.PrependReactor("list", "*", func(action k8stesting.Action) (bool, runtime.Object, error) {
			return true, nil, k8serrors.NewNotFound(schema.GroupResource{Resource: "inferenceservices"}, "")
		})

		_, err := client.DiscoverResourceGVR(context.Background(), "serving.kserve.io", "inferenceservices", "ns1", []string{"v1", "v1beta1"})
		if err == nil {
			t.Error("expected error when no version found")
		}
	})

	t.Run("skips forbidden versions", func(t *testing.T) {
		client, _, dc := newTokenClientWithFakes()
		dc.PrependReactor("list", "*", func(action k8stesting.Action) (bool, runtime.Object, error) {
			listAction := action.(k8stesting.ListAction)
			gvr := listAction.GetResource()
			if gvr.Version == "v1" {
				return true, nil, k8serrors.NewForbidden(schema.GroupResource{Resource: gvr.Resource}, "", nil)
			}
			return true, &unstructured.UnstructuredList{}, nil
		})

		gvr, err := client.DiscoverResourceGVR(context.Background(), "apps", "deployments", "ns1", []string{"v1", "v1beta1"})
		if err != nil {
			t.Fatal(err)
		}
		if gvr.Version != "v1beta1" {
			t.Errorf("Version = %q, want %q", gvr.Version, "v1beta1")
		}
	})
}

func TestTokenClient_ListResources(t *testing.T) {
	t.Run("namespaced", func(t *testing.T) {
		client, _, dc := newTokenClientWithFakes()
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
	})

	t.Run("cluster-scoped", func(t *testing.T) {
		client, _, dc := newTokenClientWithFakes()
		gvr := schema.GroupVersionResource{Group: "", Version: "v1", Resource: "nodes"}
		dc.PrependReactor("list", "nodes", func(action k8stesting.Action) (bool, runtime.Object, error) {
			return true, &unstructured.UnstructuredList{
				Object: map[string]interface{}{"apiVersion": "v1", "kind": "NodeList"},
			}, nil
		})

		_, err := client.ListResources(context.Background(), gvr, "")
		if err != nil {
			t.Fatal(err)
		}
	})
}

// --- helpers ---

type roundTripperFunc func(*http.Request) (*http.Response, error)

func (f roundTripperFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}
