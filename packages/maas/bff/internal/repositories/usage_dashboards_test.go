package repositories

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"time"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	dynamicfake "k8s.io/client-go/dynamic/fake"
)

func newFakeUsageDashboardClient(t *testing.T) dynamic.Interface {
	t.Helper()
	client := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), map[schema.GroupVersionResource]string{
		persesDashboardGVR: "PersesDashboardList",
	})
	for _, name := range []string{userUsageDashboardName, adminUsageDashboardName} {
		resource := &unstructured.Unstructured{Object: map[string]any{
			"apiVersion": "perses.dev/v1alpha2",
			"kind":       "PersesDashboard",
			"metadata":   map[string]any{"name": name, "namespace": "custom-monitoring"},
			"spec":       map[string]any{"config": map[string]any{"display": map[string]any{"name": name}}},
		}}
		if _, err := client.Resource(persesDashboardGVR).Namespace("custom-monitoring").Create(context.Background(), resource, metav1.CreateOptions{}); err != nil {
			t.Fatal(err)
		}
	}
	return client
}

func TestUsageDashboardClientReuse(t *testing.T) {
	repo := NewUsageDashboardsRepository("custom-monitoring", false)
	client := newFakeUsageDashboardClient(t)
	creations := 0
	repo.clientFactory = func() (dynamic.Interface, error) {
		creations++
		return client, nil
	}
	for _, user := range []*models.MaaSWhoAmI{{Sub: "admin", IsAdmin: true}, {Sub: "user"}} {
		if _, err := repo.List(context.Background(), user); err != nil {
			t.Fatal(err)
		}
	}
	if creations != 1 {
		t.Fatalf("client created %d times, want 1", creations)
	}
}

func TestUsageDashboardClientInitializationRetry(t *testing.T) {
	repo := NewUsageDashboardsRepository("custom-monitoring", false)
	client := newFakeUsageDashboardClient(t)
	setupErr := errors.New("temporary credentials failure")
	creations := 0
	repo.clientFactory = func() (dynamic.Interface, error) {
		creations++
		if creations == 1 {
			return nil, setupErr
		}
		return client, nil
	}
	user := &models.MaaSWhoAmI{Sub: "user"}
	if _, err := repo.List(context.Background(), user); !errors.Is(err, setupErr) {
		t.Fatalf("first read error = %v, want %v", err, setupErr)
	}
	if _, err := repo.List(context.Background(), user); err != nil {
		t.Fatal(err)
	}
	if creations != 2 {
		t.Fatalf("client created %d times, want 2", creations)
	}
}

func TestUsageDashboardsRepositoryList(t *testing.T) {
	tests := []struct {
		name      string
		user      *models.MaaSWhoAmI
		namespace string
		wantNames []string
		wantErr   error
	}{
		{name: "regular user", user: &models.MaaSWhoAmI{Sub: "user"}, namespace: "custom-monitoring", wantNames: []string{userUsageDashboardName}},
		{name: "admin", user: &models.MaaSWhoAmI{Sub: "admin", IsAdmin: true}, namespace: "custom-monitoring", wantNames: []string{userUsageDashboardName, adminUsageDashboardName}},
		{name: "missing user", namespace: "custom-monitoring", wantErr: ErrInvalidMaaSUser},
		{name: "missing subject", user: &models.MaaSWhoAmI{IsAdmin: true}, namespace: "custom-monitoring", wantErr: ErrInvalidMaaSUser},
		{name: "missing namespace", user: &models.MaaSWhoAmI{Sub: "user"}, wantErr: ErrPersesNamespaceNotConfigured},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var reads []string
			repo := &UsageDashboardsRepository{namespace: tt.namespace, reader: func(_ context.Context, namespace, name string) (map[string]any, error) {
				if namespace != tt.namespace {
					t.Errorf("namespace = %q, want %q", namespace, tt.namespace)
				}
				reads = append(reads, name)
				return map[string]any{"metadata": map[string]any{"name": name}}, nil
			}}
			dashboards, err := repo.List(context.Background(), tt.user)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if !reflect.DeepEqual(reads, tt.wantNames) {
				t.Fatalf("reads = %v, want %v", reads, tt.wantNames)
			}
			if len(dashboards) != len(tt.wantNames) {
				t.Fatalf("dashboard count = %d, want %d", len(dashboards), len(tt.wantNames))
			}
		})
	}
}

func TestUsageDashboardResource(t *testing.T) {
	created := metav1.NewTime(time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC))
	resource := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "perses.dev/v1alpha2",
		"kind":       "PersesDashboard",
		"metadata": map[string]any{
			"name":              userUsageDashboardName,
			"generation":        int64(3),
			"creationTimestamp": created.Format(time.RFC3339),
		},
		"spec": map[string]any{"config": map[string]any{
			"display": map[string]any{"name": "My Usage"}, "panels": map[string]any{},
		}},
	}}
	result, err := usageDashboardResource(resource, "custom-monitoring")
	if err != nil {
		t.Fatal(err)
	}
	metadata := result["metadata"].(map[string]any)
	if metadata["project"] != "custom-monitoring" || metadata["name"] != userUsageDashboardName || metadata["version"] != int64(3) {
		t.Fatalf("incorrect Perses metadata: %v", metadata)
	}
	if metadata["createdAt"] != created.Format(time.RFC3339) || metadata["updatedAt"] != created.Format(time.RFC3339) {
		t.Fatalf("incorrect Perses timestamps: %v", metadata)
	}
	if result["kind"] != "Dashboard" || result["spec"].(map[string]any)["display"].(map[string]any)["name"] != "My Usage" {
		t.Fatalf("incorrect Perses dashboard: %v", result)
	}
	if _, ok := result["spec"].(map[string]any)["datasources"].(map[string]any); !ok {
		t.Fatal("dashboard is missing default datasources")
	}
	resource.Object["spec"] = map[string]any{}
	if _, err := usageDashboardResource(resource, "custom-monitoring"); err == nil {
		t.Fatal("expected an error for missing spec.config")
	}
	resource.SetName(adminUsageDashboardName)
	resource.Object["spec"] = map[string]any{"config": map[string]any{"display": map[string]any{"name": "Usage"}}}
	admin, err := usageDashboardResource(resource, "custom-monitoring")
	if err != nil {
		t.Fatal(err)
	}
	if admin["spec"].(map[string]any)["display"].(map[string]any)["name"] != "Usage" {
		t.Fatalf("admin dashboard tab name = %v", admin["spec"])
	}
	if resource.Object["spec"].(map[string]any)["config"].(map[string]any)["display"].(map[string]any)["name"] != "Usage" {
		t.Fatal("source PersesDashboard was modified")
	}
}
