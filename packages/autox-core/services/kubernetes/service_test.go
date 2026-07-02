package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"testing"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
)

type mockClient struct {
	listResourcesFn       func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error)
	getResourceFn         func(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error)
	createResourceFn      func(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error)
	getNamespacesFn       func(ctx context.Context) ([]v1.Namespace, error)
	getPodsFn             func(ctx context.Context, namespace string) (*v1.PodList, error)
	getSecretsFn          func(ctx context.Context, namespace string) ([]v1.Secret, error)
	getSecretFn           func(ctx context.Context, namespace, secretName string) (*v1.Secret, error)
	getUserFn             func(ctx context.Context) (string, error)
	isClusterAdminFn      func(ctx context.Context) (bool, error)
	canAccessResourceFn   func(ctx context.Context, namespace, verb, group, resource, name string) (bool, error)
	discoverResourceGVRFn func(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error)
}

func (m *mockClient) ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
	return m.listResourcesFn(ctx, gvr, namespace)
}
func (m *mockClient) GetResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error) {
	return m.getResourceFn(ctx, gvr, namespace, name)
}
func (m *mockClient) CreateResource(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	return m.createResourceFn(ctx, gvr, namespace, obj)
}
func (m *mockClient) GetNamespaces(ctx context.Context) ([]v1.Namespace, error) {
	return m.getNamespacesFn(ctx)
}
func (m *mockClient) GetPods(ctx context.Context, namespace string) (*v1.PodList, error) {
	return m.getPodsFn(ctx, namespace)
}
func (m *mockClient) GetSecrets(ctx context.Context, namespace string) ([]v1.Secret, error) {
	return m.getSecretsFn(ctx, namespace)
}
func (m *mockClient) GetSecret(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
	return m.getSecretFn(ctx, namespace, secretName)
}
func (m *mockClient) GetUser(ctx context.Context) (string, error) {
	return m.getUserFn(ctx)
}
func (m *mockClient) IsClusterAdmin(ctx context.Context) (bool, error) {
	return m.isClusterAdminFn(ctx)
}
func (m *mockClient) CanAccessResource(ctx context.Context, namespace, verb, group, resource, name string) (bool, error) {
	return m.canAccessResourceFn(ctx, namespace, verb, group, resource, name)
}
func (m *mockClient) DiscoverResourceGVR(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
	return m.discoverResourceGVRFn(ctx, group, resource, namespace, knownVersions)
}

func newTestService(client *mockClient) *service {
	return &service{Client: client, Logger: slog.Default()}
}

func ctxWithUser(userID string) context.Context {
	return ContextWithIdentity(context.Background(), &RequestIdentity{UserID: userID})
}

// --- Namespace Tests ---

func TestService_GetNamespaces(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		client := &mockClient{
			getNamespacesFn: func(ctx context.Context) ([]v1.Namespace, error) {
				return []v1.Namespace{
					{ObjectMeta: metav1.ObjectMeta{Name: "ns1"}},
					{ObjectMeta: metav1.ObjectMeta{Name: "ns2"}},
				}, nil
			},
		}
		svc := newTestService(client)

		namespaces, err := svc.GetNamespaces(ctxWithUser("alice"))
		if err != nil {
			t.Fatal(err)
		}
		if len(namespaces) != 2 {
			t.Errorf("expected 2 namespaces, got %d", len(namespaces))
		}
	})

	t.Run("error", func(t *testing.T) {
		client := &mockClient{
			getNamespacesFn: func(ctx context.Context) ([]v1.Namespace, error) {
				return nil, fmt.Errorf("connection refused")
			},
		}
		svc := newTestService(client)

		_, err := svc.GetNamespaces(ctxWithUser("alice"))
		if err == nil {
			t.Error("expected error")
		}
	})
}

func TestService_GetNamespaceInfos(t *testing.T) {
	client := &mockClient{
		getNamespacesFn: func(ctx context.Context) ([]v1.Namespace, error) {
			return []v1.Namespace{
				{ObjectMeta: metav1.ObjectMeta{
					Name:        "ns1",
					Annotations: map[string]string{"openshift.io/display-name": "Namespace One"},
				}},
				{ObjectMeta: metav1.ObjectMeta{Name: "ns2"}},
			}, nil
		},
	}
	svc := newTestService(client)

	infos, err := svc.GetNamespaceInfos(ctxWithUser("alice"))
	if err != nil {
		t.Fatal(err)
	}
	if len(infos) != 2 {
		t.Fatalf("expected 2 infos, got %d", len(infos))
	}
	if infos[0].DisplayName != "Namespace One" {
		t.Errorf("DisplayName = %q, want %q", infos[0].DisplayName, "Namespace One")
	}
	if infos[1].DisplayName != "ns2" {
		t.Errorf("DisplayName = %q, want %q", infos[1].DisplayName, "ns2")
	}
}

func TestService_GetAccessibleNamespaces(t *testing.T) {
	t.Run("admin gets all", func(t *testing.T) {
		client := &mockClient{
			isClusterAdminFn: func(ctx context.Context) (bool, error) { return true, nil },
			getNamespacesFn: func(ctx context.Context) ([]v1.Namespace, error) {
				return []v1.Namespace{
					{ObjectMeta: metav1.ObjectMeta{Name: "ns1"}},
					{ObjectMeta: metav1.ObjectMeta{Name: "ns2"}},
				}, nil
			},
		}
		svc := newTestService(client)

		namespaces, err := svc.GetAccessibleNamespaces(ctxWithUser("admin"))
		if err != nil {
			t.Fatal(err)
		}
		if len(namespaces) != 2 {
			t.Errorf("expected 2 namespaces, got %d", len(namespaces))
		}
	})

	t.Run("non-admin filters by permission", func(t *testing.T) {
		client := &mockClient{
			isClusterAdminFn: func(ctx context.Context) (bool, error) { return false, nil },
			getNamespacesFn: func(ctx context.Context) ([]v1.Namespace, error) {
				return []v1.Namespace{
					{ObjectMeta: metav1.ObjectMeta{Name: "allowed"}},
					{ObjectMeta: metav1.ObjectMeta{Name: "denied"}},
				}, nil
			},
			canAccessResourceFn: func(ctx context.Context, namespace, verb, group, resource, name string) (bool, error) {
				return namespace == "allowed", nil
			},
		}
		svc := newTestService(client)

		namespaces, err := svc.GetAccessibleNamespaces(ctxWithUser("user"))
		if err != nil {
			t.Fatal(err)
		}
		if len(namespaces) != 1 || namespaces[0].Name != "allowed" {
			t.Errorf("expected [allowed], got %v", namespaces)
		}
	})

	t.Run("admin check error falls through to filtering", func(t *testing.T) {
		client := &mockClient{
			isClusterAdminFn: func(ctx context.Context) (bool, error) { return false, fmt.Errorf("check failed") },
			getNamespacesFn: func(ctx context.Context) ([]v1.Namespace, error) {
				return []v1.Namespace{{ObjectMeta: metav1.ObjectMeta{Name: "ns1"}}}, nil
			},
			canAccessResourceFn: func(ctx context.Context, namespace, verb, group, resource, name string) (bool, error) {
				return true, nil
			},
		}
		svc := newTestService(client)

		namespaces, err := svc.GetAccessibleNamespaces(ctxWithUser("user"))
		if err != nil {
			t.Fatal(err)
		}
		if len(namespaces) != 1 {
			t.Errorf("expected 1 namespace, got %d", len(namespaces))
		}
	})

	t.Run("access check error skips namespace", func(t *testing.T) {
		client := &mockClient{
			isClusterAdminFn: func(ctx context.Context) (bool, error) { return false, nil },
			getNamespacesFn: func(ctx context.Context) ([]v1.Namespace, error) {
				return []v1.Namespace{{ObjectMeta: metav1.ObjectMeta{Name: "ns1"}}}, nil
			},
			canAccessResourceFn: func(ctx context.Context, namespace, verb, group, resource, name string) (bool, error) {
				return false, fmt.Errorf("ssar failed")
			},
		}
		svc := newTestService(client)

		namespaces, err := svc.GetAccessibleNamespaces(ctxWithUser("user"))
		if err != nil {
			t.Fatal(err)
		}
		if len(namespaces) != 0 {
			t.Errorf("expected 0 namespaces, got %d", len(namespaces))
		}
	})
}

func TestService_GetAccessibleNamespaceInfos(t *testing.T) {
	t.Run("admin gets all with display names", func(t *testing.T) {
		client := &mockClient{
			isClusterAdminFn: func(ctx context.Context) (bool, error) { return true, nil },
			getNamespacesFn: func(ctx context.Context) ([]v1.Namespace, error) {
				return []v1.Namespace{
					{ObjectMeta: metav1.ObjectMeta{
						Name:        "ns1",
						Annotations: map[string]string{"openshift.io/display-name": "NS1"},
					}},
				}, nil
			},
		}
		svc := newTestService(client)

		infos, err := svc.GetAccessibleNamespaceInfos(ctxWithUser("admin"))
		if err != nil {
			t.Fatal(err)
		}
		if len(infos) != 1 || infos[0].DisplayName != "NS1" {
			t.Errorf("unexpected infos: %+v", infos)
		}
	})

	t.Run("non-admin filters and resolves display names", func(t *testing.T) {
		client := &mockClient{
			isClusterAdminFn: func(ctx context.Context) (bool, error) { return false, nil },
			getNamespacesFn: func(ctx context.Context) ([]v1.Namespace, error) {
				return []v1.Namespace{
					{ObjectMeta: metav1.ObjectMeta{
						Name:        "allowed",
						Annotations: map[string]string{"openshift.io/display-name": "Allowed NS"},
					}},
					{ObjectMeta: metav1.ObjectMeta{Name: "denied"}},
				}, nil
			},
			canAccessResourceFn: func(ctx context.Context, namespace, verb, group, resource, name string) (bool, error) {
				return namespace == "allowed", nil
			},
		}
		svc := newTestService(client)

		infos, err := svc.GetAccessibleNamespaceInfos(ctxWithUser("user"))
		if err != nil {
			t.Fatal(err)
		}
		if len(infos) != 1 {
			t.Fatalf("expected 1 info, got %d", len(infos))
		}
		if infos[0].Name != "allowed" || infos[0].DisplayName != "Allowed NS" {
			t.Errorf("unexpected info: %+v", infos[0])
		}
	})
}

// --- Pods Tests ---

func TestService_GetPods(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		client := &mockClient{
			getPodsFn: func(ctx context.Context, namespace string) (*v1.PodList, error) {
				return &v1.PodList{
					Items: []v1.Pod{{ObjectMeta: metav1.ObjectMeta{Name: "pod1"}}},
				}, nil
			},
		}
		svc := newTestService(client)

		pods, err := svc.GetPods(ctxWithUser("alice"), "my-ns")
		if err != nil {
			t.Fatal(err)
		}
		if len(pods.Items) != 1 {
			t.Errorf("expected 1 pod, got %d", len(pods.Items))
		}
	})

	t.Run("invalid namespace", func(t *testing.T) {
		svc := newTestService(&mockClient{})
		_, err := svc.GetPods(ctxWithUser("alice"), "INVALID NS")
		if err == nil {
			t.Error("expected validation error")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Errorf("expected *ValidationError, got %T", err)
		}
	})
}

// --- Secrets Tests ---

func TestService_GetSecrets(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		client := &mockClient{
			getSecretsFn: func(ctx context.Context, namespace string) ([]v1.Secret, error) {
				return []v1.Secret{
					{ObjectMeta: metav1.ObjectMeta{Name: "secret1"}},
				}, nil
			},
		}
		svc := newTestService(client)

		secrets, err := svc.GetSecrets(ctxWithUser("alice"), "my-ns")
		if err != nil {
			t.Fatal(err)
		}
		if len(secrets) != 1 {
			t.Errorf("expected 1 secret, got %d", len(secrets))
		}
	})

	t.Run("invalid namespace", func(t *testing.T) {
		svc := newTestService(&mockClient{})
		_, err := svc.GetSecrets(ctxWithUser("alice"), "INVALID")
		if err == nil {
			t.Error("expected validation error")
		}
	})
}

func TestService_GetSecretInfos(t *testing.T) {
	client := &mockClient{
		getSecretsFn: func(ctx context.Context, namespace string) ([]v1.Secret, error) {
			return []v1.Secret{
				{
					ObjectMeta: metav1.ObjectMeta{
						Name: "s3-cred",
						UID:  types.UID("uid-123"),
						Annotations: map[string]string{
							"opendatahub.io/connection-type": "s3",
							"openshift.io/display-name":      "S3 Credentials",
							"openshift.io/description":       "S3 access keys",
						},
					},
					Data: map[string][]byte{
						"accessKey": []byte("AKIA"),
						"secretKey": []byte("secret"),
					},
				},
				{
					ObjectMeta: metav1.ObjectMeta{
						Name: "plain-secret",
						UID:  types.UID("uid-456"),
					},
					Data: map[string][]byte{"key": []byte("val")},
				},
			}, nil
		},
	}
	svc := newTestService(client)

	infos, err := svc.GetSecretInfos(ctxWithUser("alice"), "my-ns")
	if err != nil {
		t.Fatal(err)
	}
	if len(infos) != 2 {
		t.Fatalf("expected 2 infos, got %d", len(infos))
	}

	if infos[0].UUID != "uid-123" || infos[0].Name != "s3-cred" || infos[0].Type != "s3" {
		t.Errorf("unexpected first info: %+v", infos[0])
	}
	if infos[0].DisplayName != "S3 Credentials" || infos[0].Description != "S3 access keys" {
		t.Errorf("unexpected annotations: display=%q desc=%q", infos[0].DisplayName, infos[0].Description)
	}
	if infos[0].Data["accessKey"] != "AKIA" {
		t.Errorf("expected accessKey=AKIA, got %q", infos[0].Data["accessKey"])
	}

	if infos[1].Type != "" {
		t.Errorf("expected empty type for plain secret, got %q", infos[1].Type)
	}
}

func TestService_GetSecret(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		client := &mockClient{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return &v1.Secret{ObjectMeta: metav1.ObjectMeta{Name: secretName}}, nil
			},
		}
		svc := newTestService(client)

		secret, err := svc.GetSecret(ctxWithUser("alice"), "my-ns", "my-secret")
		if err != nil {
			t.Fatal(err)
		}
		if secret.Name != "my-secret" {
			t.Errorf("Name = %q, want %q", secret.Name, "my-secret")
		}
	})

	t.Run("invalid namespace", func(t *testing.T) {
		svc := newTestService(&mockClient{})
		_, err := svc.GetSecret(ctxWithUser("alice"), "INVALID", "my-secret")
		if err == nil {
			t.Error("expected validation error")
		}
	})

	t.Run("invalid secret name", func(t *testing.T) {
		svc := newTestService(&mockClient{})
		_, err := svc.GetSecret(ctxWithUser("alice"), "my-ns", "INVALID NAME")
		if err == nil {
			t.Error("expected validation error")
		}
	})
}

// --- User & Auth Tests ---

func TestService_GetUser(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		client := &mockClient{
			getUserFn: func(ctx context.Context) (string, error) {
				return "alice", nil
			},
		}
		svc := newTestService(client)

		user, err := svc.GetUser(ctxWithUser("alice"))
		if err != nil {
			t.Fatal(err)
		}
		if user != "alice" {
			t.Errorf("user = %q, want %q", user, "alice")
		}
	})

	t.Run("error", func(t *testing.T) {
		client := &mockClient{
			getUserFn: func(ctx context.Context) (string, error) {
				return "", fmt.Errorf("auth failed")
			},
		}
		svc := newTestService(client)

		_, err := svc.GetUser(ctxWithUser("alice"))
		if err == nil {
			t.Error("expected error")
		}
	})
}

func TestService_IsClusterAdmin(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		client := &mockClient{
			isClusterAdminFn: func(ctx context.Context) (bool, error) {
				return true, nil
			},
		}
		svc := newTestService(client)

		isAdmin, err := svc.IsClusterAdmin(ctxWithUser("admin"))
		if err != nil {
			t.Fatal(err)
		}
		if !isAdmin {
			t.Error("expected true")
		}
	})

	t.Run("error", func(t *testing.T) {
		client := &mockClient{
			isClusterAdminFn: func(ctx context.Context) (bool, error) {
				return false, fmt.Errorf("failed")
			},
		}
		svc := newTestService(client)

		_, err := svc.IsClusterAdmin(ctxWithUser("admin"))
		if err == nil {
			t.Error("expected error")
		}
	})
}

func TestService_GetUserInfo(t *testing.T) {
	t.Run("regular user", func(t *testing.T) {
		client := &mockClient{
			getUserFn:        func(ctx context.Context) (string, error) { return "alice", nil },
			isClusterAdminFn: func(ctx context.Context) (bool, error) { return false, nil },
		}
		svc := newTestService(client)

		info, err := svc.GetUserInfo(ctxWithUser("alice"))
		if err != nil {
			t.Fatal(err)
		}
		if info.UserID != "alice" || info.ClusterAdmin {
			t.Errorf("unexpected info: %+v", info)
		}
	})

	t.Run("service account name extraction", func(t *testing.T) {
		client := &mockClient{
			getUserFn:        func(ctx context.Context) (string, error) { return "system:serviceaccount:ns:my-sa", nil },
			isClusterAdminFn: func(ctx context.Context) (bool, error) { return true, nil },
		}
		svc := newTestService(client)

		info, err := svc.GetUserInfo(ctxWithUser("sa"))
		if err != nil {
			t.Fatal(err)
		}
		if info.UserID != "my-sa" {
			t.Errorf("UserID = %q, want %q", info.UserID, "my-sa")
		}
		if !info.ClusterAdmin {
			t.Error("expected ClusterAdmin=true")
		}
	})

	t.Run("GetUser error", func(t *testing.T) {
		client := &mockClient{
			getUserFn: func(ctx context.Context) (string, error) { return "", fmt.Errorf("failed") },
		}
		svc := newTestService(client)

		_, err := svc.GetUserInfo(ctxWithUser("alice"))
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("IsClusterAdmin error", func(t *testing.T) {
		client := &mockClient{
			getUserFn:        func(ctx context.Context) (string, error) { return "alice", nil },
			isClusterAdminFn: func(ctx context.Context) (bool, error) { return false, fmt.Errorf("failed") },
		}
		svc := newTestService(client)

		_, err := svc.GetUserInfo(ctxWithUser("alice"))
		if err == nil {
			t.Error("expected error")
		}
	})
}

func TestService_CanAccessResource(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		client := &mockClient{
			canAccessResourceFn: func(ctx context.Context, namespace, verb, group, resource, name string) (bool, error) {
				return true, nil
			},
		}
		svc := newTestService(client)

		can, err := svc.CanAccessResource(ctxWithUser("alice"), "my-ns", "get", "", "pods", "")
		if err != nil {
			t.Fatal(err)
		}
		if !can {
			t.Error("expected true")
		}
	})

	t.Run("invalid namespace", func(t *testing.T) {
		svc := newTestService(&mockClient{})
		_, err := svc.CanAccessResource(ctxWithUser("alice"), "INVALID", "get", "", "pods", "")
		if err == nil {
			t.Error("expected validation error")
		}
	})

	t.Run("empty namespace is allowed (cluster-scoped)", func(t *testing.T) {
		client := &mockClient{
			canAccessResourceFn: func(ctx context.Context, namespace, verb, group, resource, name string) (bool, error) {
				return true, nil
			},
		}
		svc := newTestService(client)

		can, err := svc.CanAccessResource(ctxWithUser("alice"), "", "list", "", "nodes", "")
		if err != nil {
			t.Fatal(err)
		}
		if !can {
			t.Error("expected true")
		}
	})
}

// --- Generic Resource Tests ---

func TestService_ListResources(t *testing.T) {
	gvr := schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}

	t.Run("namespaced", func(t *testing.T) {
		client := &mockClient{
			listResourcesFn: func(ctx context.Context, g schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return &unstructured.UnstructuredList{Items: []unstructured.Unstructured{{}}}, nil
			},
		}
		svc := newTestService(client)

		list, err := svc.ListResources(ctxWithUser("alice"), gvr, "my-ns")
		if err != nil {
			t.Fatal(err)
		}
		if len(list.Items) != 1 {
			t.Errorf("expected 1 item, got %d", len(list.Items))
		}
	})

	t.Run("cluster-scoped (empty namespace)", func(t *testing.T) {
		client := &mockClient{
			listResourcesFn: func(ctx context.Context, g schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				if namespace != "" {
					t.Errorf("expected empty namespace, got %q", namespace)
				}
				return &unstructured.UnstructuredList{}, nil
			},
		}
		svc := newTestService(client)

		_, err := svc.ListResources(ctxWithUser("alice"), gvr, "")
		if err != nil {
			t.Fatal(err)
		}
	})

	t.Run("invalid namespace", func(t *testing.T) {
		svc := newTestService(&mockClient{})
		_, err := svc.ListResources(ctxWithUser("alice"), gvr, "INVALID")
		if err == nil {
			t.Error("expected validation error")
		}
	})
}

func TestService_GetResource(t *testing.T) {
	gvr := schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}

	t.Run("success", func(t *testing.T) {
		client := &mockClient{
			getResourceFn: func(ctx context.Context, g schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error) {
				obj := &unstructured.Unstructured{}
				obj.SetName(name)
				return obj, nil
			},
		}
		svc := newTestService(client)

		obj, err := svc.GetResource(ctxWithUser("alice"), gvr, "my-ns", "my-deploy")
		if err != nil {
			t.Fatal(err)
		}
		if obj.GetName() != "my-deploy" {
			t.Errorf("Name = %q, want %q", obj.GetName(), "my-deploy")
		}
	})

	t.Run("invalid resource name", func(t *testing.T) {
		svc := newTestService(&mockClient{})
		_, err := svc.GetResource(ctxWithUser("alice"), gvr, "my-ns", "INVALID NAME")
		if err == nil {
			t.Error("expected validation error")
		}
	})

	t.Run("invalid namespace", func(t *testing.T) {
		svc := newTestService(&mockClient{})
		_, err := svc.GetResource(ctxWithUser("alice"), gvr, "INVALID", "my-deploy")
		if err == nil {
			t.Error("expected validation error")
		}
	})

	t.Run("client error", func(t *testing.T) {
		client := &mockClient{
			getResourceFn: func(ctx context.Context, g schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error) {
				return nil, fmt.Errorf("not found")
			},
		}
		svc := newTestService(client)
		_, err := svc.GetResource(ctxWithUser("alice"), gvr, "my-ns", "my-deploy")
		if err == nil {
			t.Error("expected error")
		}
	})
}

func TestService_CreateResource(t *testing.T) {
	gvr := schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}

	t.Run("success", func(t *testing.T) {
		client := &mockClient{
			createResourceFn: func(ctx context.Context, g schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
				return obj, nil
			},
		}
		svc := newTestService(client)

		obj := &unstructured.Unstructured{}
		obj.SetName("new-deploy")
		created, err := svc.CreateResource(ctxWithUser("alice"), gvr, "my-ns", obj)
		if err != nil {
			t.Fatal(err)
		}
		if created.GetName() != "new-deploy" {
			t.Errorf("Name = %q, want %q", created.GetName(), "new-deploy")
		}
	})

	t.Run("invalid namespace", func(t *testing.T) {
		svc := newTestService(&mockClient{})
		obj := &unstructured.Unstructured{}
		obj.SetName("new-deploy")
		_, err := svc.CreateResource(ctxWithUser("alice"), gvr, "INVALID", obj)
		if err == nil {
			t.Error("expected validation error")
		}
	})

	t.Run("invalid resource name", func(t *testing.T) {
		svc := newTestService(&mockClient{})
		obj := &unstructured.Unstructured{}
		obj.SetName("INVALID NAME")
		_, err := svc.CreateResource(ctxWithUser("alice"), gvr, "my-ns", obj)
		if err == nil {
			t.Error("expected validation error")
		}
	})

	t.Run("client error", func(t *testing.T) {
		client := &mockClient{
			createResourceFn: func(ctx context.Context, g schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
				return nil, fmt.Errorf("conflict")
			},
		}
		svc := newTestService(client)
		obj := &unstructured.Unstructured{}
		obj.SetName("my-deploy")
		_, err := svc.CreateResource(ctxWithUser("alice"), gvr, "my-ns", obj)
		if err == nil {
			t.Error("expected error")
		}
	})
}

// --- Discovery Tests ---

func TestService_DiscoverResourceGVR(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		expected := schema.GroupVersionResource{Group: "serving.kserve.io", Version: "v1beta1", Resource: "inferenceservices"}
		client := &mockClient{
			discoverResourceGVRFn: func(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
				return expected, nil
			},
		}
		svc := newTestService(client)

		gvr, err := svc.DiscoverResourceGVR(ctxWithUser("alice"), "serving.kserve.io", "inferenceservices", "my-ns", []string{"v1beta1", "v1alpha1"})
		if err != nil {
			t.Fatal(err)
		}
		if gvr != expected {
			t.Errorf("got %v, want %v", gvr, expected)
		}
	})

	t.Run("empty group", func(t *testing.T) {
		svc := newTestService(&mockClient{})
		_, err := svc.DiscoverResourceGVR(ctxWithUser("alice"), "", "resources", "my-ns", []string{"v1"})
		if err == nil {
			t.Error("expected validation error for empty group")
		}
	})

	t.Run("empty resource", func(t *testing.T) {
		svc := newTestService(&mockClient{})
		_, err := svc.DiscoverResourceGVR(ctxWithUser("alice"), "apps", "", "my-ns", []string{"v1"})
		if err == nil {
			t.Error("expected validation error for empty resource")
		}
	})

	t.Run("empty versions", func(t *testing.T) {
		svc := newTestService(&mockClient{})
		_, err := svc.DiscoverResourceGVR(ctxWithUser("alice"), "apps", "deployments", "my-ns", nil)
		if err == nil {
			t.Error("expected validation error for empty versions")
		}
	})

	t.Run("invalid namespace", func(t *testing.T) {
		svc := newTestService(&mockClient{})
		_, err := svc.DiscoverResourceGVR(ctxWithUser("alice"), "apps", "deployments", "INVALID", []string{"v1"})
		if err == nil {
			t.Error("expected validation error for invalid namespace")
		}
	})
}

// --- LoggerWithIdentity Tests ---

func TestLoggerWithIdentity(t *testing.T) {
	logger := slog.Default()

	t.Run("with UserID", func(t *testing.T) {
		ctx := ContextWithIdentity(context.Background(), &RequestIdentity{UserID: "alice"})
		l := LoggerWithIdentity(ctx, logger)
		if l == nil {
			t.Error("expected non-nil logger")
		}
	})

	t.Run("with Token only", func(t *testing.T) {
		ctx := ContextWithIdentity(context.Background(), &RequestIdentity{Token: "my-token"})
		l := LoggerWithIdentity(ctx, logger)
		if l == nil {
			t.Error("expected non-nil logger")
		}
	})

	t.Run("no identity returns base logger", func(t *testing.T) {
		l := LoggerWithIdentity(context.Background(), logger)
		if l != logger {
			t.Error("expected base logger when no identity")
		}
	})

	t.Run("empty identity returns base logger", func(t *testing.T) {
		ctx := ContextWithIdentity(context.Background(), &RequestIdentity{})
		l := LoggerWithIdentity(ctx, logger)
		if l == nil {
			t.Error("expected non-nil logger")
		}
	})
}

// --- Additional error-path tests for coverage ---

func TestService_GetNamespaceInfos_Error(t *testing.T) {
	client := &mockClient{
		getNamespacesFn: func(ctx context.Context) ([]v1.Namespace, error) {
			return nil, fmt.Errorf("connection refused")
		},
	}
	svc := newTestService(client)
	_, err := svc.GetNamespaceInfos(ctxWithUser("alice"))
	if err == nil {
		t.Error("expected error")
	}
}

func TestService_GetAccessibleNamespaces_ListError(t *testing.T) {
	client := &mockClient{
		isClusterAdminFn: func(ctx context.Context) (bool, error) { return true, nil },
		getNamespacesFn: func(ctx context.Context) ([]v1.Namespace, error) {
			return nil, fmt.Errorf("timeout")
		},
	}
	svc := newTestService(client)
	_, err := svc.GetAccessibleNamespaces(ctxWithUser("admin"))
	if err == nil {
		t.Error("expected error when admin namespace list fails")
	}
}

func TestService_GetAccessibleNamespaceInfos_ListError(t *testing.T) {
	client := &mockClient{
		isClusterAdminFn: func(ctx context.Context) (bool, error) { return true, nil },
		getNamespacesFn: func(ctx context.Context) ([]v1.Namespace, error) {
			return nil, fmt.Errorf("timeout")
		},
	}
	svc := newTestService(client)
	_, err := svc.GetAccessibleNamespaceInfos(ctxWithUser("admin"))
	if err == nil {
		t.Error("expected error when admin namespace list fails")
	}
}

func TestService_GetAccessibleNamespaceInfos_NonAdminListError(t *testing.T) {
	client := &mockClient{
		isClusterAdminFn: func(ctx context.Context) (bool, error) { return false, nil },
		getNamespacesFn: func(ctx context.Context) ([]v1.Namespace, error) {
			return nil, fmt.Errorf("forbidden")
		},
	}
	svc := newTestService(client)
	_, err := svc.GetAccessibleNamespaceInfos(ctxWithUser("user"))
	if err == nil {
		t.Error("expected error")
	}
}

func TestService_GetPods_ClientError(t *testing.T) {
	client := &mockClient{
		getPodsFn: func(ctx context.Context, namespace string) (*v1.PodList, error) {
			return nil, fmt.Errorf("timeout")
		},
	}
	svc := newTestService(client)
	_, err := svc.GetPods(ctxWithUser("alice"), "my-ns")
	if err == nil {
		t.Error("expected error")
	}
}

func TestService_GetSecrets_ClientError(t *testing.T) {
	client := &mockClient{
		getSecretsFn: func(ctx context.Context, namespace string) ([]v1.Secret, error) {
			return nil, fmt.Errorf("forbidden")
		},
	}
	svc := newTestService(client)
	_, err := svc.GetSecrets(ctxWithUser("alice"), "my-ns")
	if err == nil {
		t.Error("expected error")
	}
}

func TestService_GetSecretInfos_ClientError(t *testing.T) {
	client := &mockClient{
		getSecretsFn: func(ctx context.Context, namespace string) ([]v1.Secret, error) {
			return nil, fmt.Errorf("forbidden")
		},
	}
	svc := newTestService(client)
	_, err := svc.GetSecretInfos(ctxWithUser("alice"), "my-ns")
	if err == nil {
		t.Error("expected error")
	}
}

func TestService_GetSecret_ClientError(t *testing.T) {
	client := &mockClient{
		getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
			return nil, fmt.Errorf("not found")
		},
	}
	svc := newTestService(client)
	_, err := svc.GetSecret(ctxWithUser("alice"), "my-ns", "my-secret")
	if err == nil {
		t.Error("expected error")
	}
}

func TestService_ListResources_ClientError(t *testing.T) {
	gvr := schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}
	client := &mockClient{
		listResourcesFn: func(ctx context.Context, g schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
			return nil, fmt.Errorf("forbidden")
		},
	}
	svc := newTestService(client)
	_, err := svc.ListResources(ctxWithUser("alice"), gvr, "my-ns")
	if err == nil {
		t.Error("expected error")
	}
}

func TestService_CanAccessResource_ClientError(t *testing.T) {
	client := &mockClient{
		canAccessResourceFn: func(ctx context.Context, namespace, verb, group, resource, name string) (bool, error) {
			return false, fmt.Errorf("timeout")
		},
	}
	svc := newTestService(client)
	_, err := svc.CanAccessResource(ctxWithUser("alice"), "my-ns", "get", "", "pods", "")
	if err == nil {
		t.Error("expected error")
	}
}

func TestService_DiscoverResourceGVR_ClientError(t *testing.T) {
	client := &mockClient{
		discoverResourceGVRFn: func(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
			return schema.GroupVersionResource{}, fmt.Errorf("timeout")
		},
	}
	svc := newTestService(client)
	_, err := svc.DiscoverResourceGVR(ctxWithUser("alice"), "apps", "deployments", "my-ns", []string{"v1"})
	if err == nil {
		t.Error("expected error")
	}
}
