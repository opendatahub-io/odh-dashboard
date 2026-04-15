package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	k8sfake "k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/rest"
	k8stesting "k8s.io/client-go/testing"
)

// clusterAdminCRB returns a ClusterRoleBinding that grants cluster-admin to the given user.
// Adding this to the fake clientset makes IsClusterAdmin return true, which bypasses
// the SAR worker pool and exercises the simple namespace list path.
func clusterAdminCRB(user string) *rbacv1.ClusterRoleBinding {
	return &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{Name: "test-admin-binding"},
		RoleRef: rbacv1.RoleRef{
			Kind: "ClusterRole",
			Name: "cluster-admin",
		},
		Subjects: []rbacv1.Subject{
			{Kind: "User", Name: user},
		},
	}
}

// unreachableRestConfig returns a rest.Config pointing to a host that will never connect.
// This is used to verify the fallback path is entered: the dynamic client is created
// successfully but any API call against it fails.
func unreachableRestConfig() *rest.Config {
	return &rest.Config{Host: "https://192.0.2.1:6443"}
}

func TestInternalKubernetesClient_GetNamespaces_ListSucceeds(t *testing.T) {
	logger := slog.Default()

	ns1 := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "ns-1"}}
	ns2 := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "ns-2"}}
	crb := clusterAdminCRB("admin-user")

	clientset := k8sfake.NewSimpleClientset(ns1, ns2, crb)

	kc := &InternalKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client: clientset,
			Logger: logger,
		},
	}

	identity := &RequestIdentity{
		UserID: "admin-user",
		Groups: []string{"system:masters"},
	}

	result, err := kc.GetNamespaces(context.Background(), identity)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Fatalf("expected 2 namespaces, got %d", len(result))
	}
}

func TestInternalKubernetesClient_GetNamespaces_PropagatesNonForbiddenError(t *testing.T) {
	logger := slog.Default()

	clientset := k8sfake.NewSimpleClientset()
	clientset.PrependReactor("list", "namespaces", func(_ k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewInternalError(fmt.Errorf("api server unavailable"))
	})

	kc := &InternalKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client: clientset,
			Logger: logger,
		},
	}

	identity := &RequestIdentity{
		UserID: "non-admin-user",
		Groups: []string{"developers"},
	}

	_, err := kc.GetNamespaces(context.Background(), identity)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "failed to list namespaces") {
		t.Fatalf("expected 'failed to list namespaces' error, got: %v", err)
	}
}

func TestInternalKubernetesClient_GetNamespaces_ForbiddenTriggersProjectsFallback(t *testing.T) {
	logger := slog.Default()

	clientset := k8sfake.NewSimpleClientset()
	clientset.PrependReactor("list", "namespaces", func(_ k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewForbidden(
			schema.GroupResource{Resource: "namespaces"}, "", fmt.Errorf("access denied"),
		)
	})

	kc := &InternalKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client:     clientset,
			Logger:     logger,
			RestConfig: unreachableRestConfig(),
		},
	}

	identity := &RequestIdentity{
		UserID: "non-admin-user",
		Groups: []string{"developers"},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	_, err := kc.GetNamespaces(ctx, identity)
	if err == nil {
		t.Fatal("expected error from fallback path, got nil")
	}

	// The error must NOT be the original "failed to list namespaces" — that would mean
	// the fallback was not entered.
	if strings.Contains(err.Error(), "failed to list namespaces") {
		t.Fatalf("expected fallback path error, got namespace list error: %v", err)
	}
	// The fallback creates clients against the unreachable host. Depending on the stage
	// that fails, we expect either a "failed to list projects" or connection error.
	// The key assertion is that the forbidden error was handled, not propagated.
}

func TestTokenKubernetesClient_GetNamespaces_ListSucceeds(t *testing.T) {
	logger := slog.Default()

	ns1 := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "ns-1"}}
	ns2 := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "ns-2"}}

	clientset := k8sfake.NewSimpleClientset(ns1, ns2)

	kc := &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client: clientset,
			Logger: logger,
		},
	}

	result, err := kc.GetNamespaces(context.Background(), nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Fatalf("expected 2 namespaces, got %d", len(result))
	}
}

func TestTokenKubernetesClient_GetNamespaces_PropagatesNonForbiddenError(t *testing.T) {
	logger := slog.Default()

	clientset := k8sfake.NewSimpleClientset()
	clientset.PrependReactor("list", "namespaces", func(_ k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewInternalError(fmt.Errorf("api server unavailable"))
	})

	kc := &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client: clientset,
			Logger: logger,
		},
	}

	_, err := kc.GetNamespaces(context.Background(), nil)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "failed to list namespaces") {
		t.Fatalf("expected 'failed to list namespaces' error, got: %v", err)
	}
}

func TestTokenKubernetesClient_GetNamespaces_ForbiddenTriggersProjectsFallback(t *testing.T) {
	logger := slog.Default()

	clientset := k8sfake.NewSimpleClientset()
	clientset.PrependReactor("list", "namespaces", func(_ k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewForbidden(
			schema.GroupResource{Resource: "namespaces"}, "", fmt.Errorf("access denied"),
		)
	})

	kc := &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client:     clientset,
			Logger:     logger,
			RestConfig: unreachableRestConfig(),
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	_, err := kc.GetNamespaces(ctx, nil)
	if err == nil {
		t.Fatal("expected error from fallback path, got nil")
	}

	// The error must NOT be the original "failed to list namespaces" — that would mean
	// the fallback was not entered.
	if strings.Contains(err.Error(), "failed to list namespaces") {
		t.Fatalf("expected fallback path error, got namespace list error: %v", err)
	}
}
