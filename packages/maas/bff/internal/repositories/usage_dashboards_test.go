package repositories

import (
	"bytes"
	"context"
	"errors"
	"io"
	"log/slog"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	dynamicfake "k8s.io/client-go/dynamic/fake"
)

func discardLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

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
	repo := NewUsageDashboardsRepository(discardLogger(), "custom-monitoring", false)
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
	repo := NewUsageDashboardsRepository(discardLogger(), "custom-monitoring", false)
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
	shared := []string{userUsageDashboardName, adminUsageDashboardName}
	portal := []string{portalUserUsageDashboardName, portalAdminUsageDashboardName}
	all := append(append([]string{}, shared...), portal...)
	forbiddenPortal := apierrors.NewForbidden(schema.GroupResource{Group: "perses.dev", Resource: "persesdashboards"}, portalUserUsageDashboardName, errors.New("denied"))
	forbiddenShared := apierrors.NewForbidden(schema.GroupResource{Group: "perses.dev", Resource: "persesdashboards"}, userUsageDashboardName, errors.New("denied"))
	unavailable := apierrors.NewServiceUnavailable("unavailable")
	const orgID = "42c3e46f-2477-44d7-a85b-d3b43f6b31fa"
	orgUser := &models.MaaSWhoAmI{Sub: "user", OrgID: orgID}
	orgAdmin := &models.MaaSWhoAmI{Sub: "admin", OrgID: orgID, IsAdmin: true}
	tokenUser := &models.MaaSWhoAmI{Sub: "user"}
	tokenAdmin := &models.MaaSWhoAmI{Sub: "admin", IsAdmin: true}
	tests := []struct {
		name      string
		user      *models.MaaSWhoAmI
		namespace string
		existing  []string
		readErr   map[string]error
		wantReads []string
		wantNames []string
		wantErr   error
		notFound  bool
		wantWarn  string
	}{
		{
			name: "user with an organization gets the Portal dashboard when it exists", user: orgUser, namespace: "custom-monitoring", existing: all,
			wantReads: []string{portalUserUsageDashboardName}, wantNames: []string{portalUserUsageDashboardName},
		},
		{
			name: "admin with an organization gets both Portal dashboards when they exist", user: orgAdmin, namespace: "custom-monitoring", existing: all,
			wantReads: []string{portalUserUsageDashboardName, portalAdminUsageDashboardName},
			wantNames: []string{portalUserUsageDashboardName, portalAdminUsageDashboardName},
		},
		{
			name: "user with an organization without Portal dashboards gets the shared one", user: orgUser, namespace: "custom-monitoring", existing: shared,
			wantReads: []string{portalUserUsageDashboardName, userUsageDashboardName}, wantNames: []string{userUsageDashboardName},
		},
		{
			name: "admin with an organization without Portal dashboards gets both shared ones", user: orgAdmin, namespace: "custom-monitoring", existing: shared,
			wantReads: []string{portalUserUsageDashboardName, userUsageDashboardName, portalAdminUsageDashboardName, adminUsageDashboardName},
			wantNames: []string{userUsageDashboardName, adminUsageDashboardName},
		},
		{
			name: "each dashboard falls back on its own for an admin with an organization", user: orgAdmin, namespace: "custom-monitoring",
			existing:  append([]string{portalUserUsageDashboardName}, shared...),
			wantReads: []string{portalUserUsageDashboardName, portalAdminUsageDashboardName, adminUsageDashboardName},
			wantNames: []string{portalUserUsageDashboardName, adminUsageDashboardName},
		},
		{
			name: "OpenShift-token user gets the shared dashboard and the Portal one is not read", user: tokenUser, namespace: "custom-monitoring", existing: all,
			wantReads: []string{userUsageDashboardName}, wantNames: []string{userUsageDashboardName},
		},
		{
			name: "OpenShift-token admin gets both shared dashboards and the Portal ones are not read", user: tokenAdmin, namespace: "custom-monitoring", existing: all,
			wantReads: []string{userUsageDashboardName, adminUsageDashboardName},
			wantNames: []string{userUsageDashboardName, adminUsageDashboardName},
		},
		{
			name: "user with an organization with neither dashboard gets NotFound", user: orgUser, namespace: "custom-monitoring",
			wantReads: []string{portalUserUsageDashboardName, userUsageDashboardName}, notFound: true,
		},
		{
			name: "OpenShift-token user without the shared dashboard gets NotFound", user: tokenUser, namespace: "custom-monitoring", existing: portal,
			wantReads: []string{userUsageDashboardName}, notFound: true,
		},
		{
			name: "Forbidden on the Portal dashboard falls back to the shared one with a warning", user: orgUser, namespace: "custom-monitoring", existing: all,
			readErr:   map[string]error{portalUserUsageDashboardName: forbiddenPortal},
			wantReads: []string{portalUserUsageDashboardName, userUsageDashboardName}, wantNames: []string{userUsageDashboardName},
			wantWarn: portalUserUsageDashboardName,
		},
		{
			name: "Forbidden on the shared dashboard is returned", user: orgUser, namespace: "custom-monitoring", existing: shared,
			readErr:   map[string]error{userUsageDashboardName: forbiddenShared},
			wantReads: []string{portalUserUsageDashboardName, userUsageDashboardName}, wantErr: forbiddenShared,
		},
		{
			name: "Forbidden on the shared dashboard is returned for an OpenShift-token user", user: tokenUser, namespace: "custom-monitoring", existing: all,
			readErr:   map[string]error{userUsageDashboardName: forbiddenShared},
			wantReads: []string{userUsageDashboardName}, wantErr: forbiddenShared,
		},
		{
			name: "another error on the Portal dashboard is returned", user: orgUser, namespace: "custom-monitoring", existing: all,
			readErr:   map[string]error{portalUserUsageDashboardName: unavailable},
			wantReads: []string{portalUserUsageDashboardName}, wantErr: unavailable,
		},
		{name: "missing user", namespace: "custom-monitoring", wantErr: ErrInvalidMaaSUser},
		{name: "missing subject", user: &models.MaaSWhoAmI{IsAdmin: true, OrgID: orgID}, namespace: "custom-monitoring", wantErr: ErrInvalidMaaSUser},
		{name: "missing namespace", user: orgUser, wantErr: ErrPersesNamespaceNotConfigured},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var reads []string
			var logs bytes.Buffer
			repo := &UsageDashboardsRepository{logger: slog.New(slog.NewTextHandler(&logs, nil)), namespace: tt.namespace, reader: func(_ context.Context, namespace, name string) (map[string]any, error) {
				if namespace != tt.namespace {
					t.Errorf("namespace = %q, want %q", namespace, tt.namespace)
				}
				reads = append(reads, name)
				if err := tt.readErr[name]; err != nil {
					return nil, err
				}
				for _, existing := range tt.existing {
					if existing == name {
						return map[string]any{"metadata": map[string]any{"name": name}}, nil
					}
				}
				return nil, apierrors.NewNotFound(schema.GroupResource{Group: "perses.dev", Resource: "persesdashboards"}, name)
			}}
			dashboards, err := repo.List(context.Background(), tt.user)
			if tt.notFound {
				if !apierrors.IsNotFound(err) {
					t.Fatalf("error = %v, want NotFound", err)
				}
			} else if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if !reflect.DeepEqual(reads, tt.wantReads) {
				t.Fatalf("reads = %v, want %v", reads, tt.wantReads)
			}
			var names []string
			for _, dashboard := range dashboards {
				names = append(names, dashboard["metadata"].(map[string]any)["name"].(string))
			}
			if !reflect.DeepEqual(names, tt.wantNames) {
				t.Fatalf("dashboards = %v, want %v", names, tt.wantNames)
			}
			logged := logs.String()
			if tt.wantWarn == "" && logged != "" {
				t.Fatalf("unexpected log output: %s", logged)
			}
			if tt.wantWarn != "" && (!strings.Contains(logged, "level=WARN") || !strings.Contains(logged, "dashboard="+tt.wantWarn) || !strings.Contains(logged, "Role may not be reconciled")) {
				t.Fatalf("missing warning for %s in log output: %s", tt.wantWarn, logged)
			}
		})
	}
}

func TestUsageDashboardServiceAccountReaderFallsBack(t *testing.T) {
	repo := NewUsageDashboardsRepository(discardLogger(), "custom-monitoring", false)
	client := newFakeUsageDashboardClient(t)
	repo.clientFactory = func() (dynamic.Interface, error) { return client, nil }
	orgAdmin := &models.MaaSWhoAmI{Sub: "admin", OrgID: "42c3e46f-2477-44d7-a85b-d3b43f6b31fa", IsAdmin: true}
	dashboards, err := repo.List(context.Background(), orgAdmin)
	if err != nil {
		t.Fatal(err)
	}
	var names []string
	for _, dashboard := range dashboards {
		names = append(names, dashboard["metadata"].(map[string]any)["name"].(string))
	}
	if want := []string{userUsageDashboardName, adminUsageDashboardName}; !reflect.DeepEqual(names, want) {
		t.Fatalf("dashboards = %v, want %v", names, want)
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
