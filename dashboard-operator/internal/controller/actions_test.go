package controller

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	routev1 "github.com/openshift/api/route/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestManifestSets(t *testing.T) {
	tests := []struct {
		name     string
		platform cluster.Platform
	}{
		{name: "SelfManagedRhoai", platform: cluster.SelfManagedRhoai},
		{name: "ManagedRhoai", platform: cluster.ManagedRhoai},
		{name: "OpenDataHub", platform: cluster.OpenDataHub},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sets := manifestSets("/base", tt.platform)
			require.Len(t, sets, 1)
			assert.Equal(t, "/base", sets[0].Path)
		})
	}
}

func TestApplyKustomizeParams(t *testing.T) {
	dir := t.TempDir()
	overlay := filepath.Join(dir, "rhoai")
	require.NoError(t, os.MkdirAll(overlay, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "params.env"), []byte("existing-key=existing-value\n"), 0644))

	dashboard := &v1alpha1.Dashboard{
		Spec: v1alpha1.DashboardSpec{
			Gateway: &v1alpha1.GatewaySpec{Domain: "apps.test.com"},
		},
	}

	manifests := manifestSets(dir, cluster.SelfManagedRhoai)
	require.NoError(t, applyKustomizeParams(dashboard, manifests, cluster.SelfManagedRhoai))

	data, err := os.ReadFile(filepath.Join(overlay, "params.env"))
	require.NoError(t, err)

	content := string(data)
	assert.Contains(t, content, "gateway-domain=apps.test.com")
	assert.Contains(t, content, "dashboard-url=https://odh-dashboard-apps.test.com")
	assert.Contains(t, content, "section-title=OpenShift Self Managed Services")
	assert.Contains(t, content, "existing-key=existing-value")
}

func TestExtractDashboardURL(t *testing.T) {
	scheme := runtime.NewScheme()
	require.NoError(t, routev1.AddToScheme(scheme))

	namespace := "test-ns"
	partOfLabel := map[string]string{labels.PlatformPartOf: "dashboard"}

	tests := []struct {
		name      string
		platform  cluster.Platform
		routes    []routev1.Route
		wantURL   string
		wantErr   error
		wantErrIs bool
	}{
		{
			name:     "xKS platform returns empty URL without error",
			platform: cluster.XKS,
		},
		{
			name:      "no routes",
			platform:  cluster.OpenDataHub,
			routes:    nil,
			wantErr:   ErrDashboardRouteNotReady,
			wantErrIs: true,
		},
		{
			name:     "route without ingress",
			platform: cluster.OpenDataHub,
			routes: []routev1.Route{
				{
					ObjectMeta: metav1.ObjectMeta{Name: "dashboard", Namespace: namespace, Labels: partOfLabel},
				},
			},
			wantErr:   ErrDashboardRouteNotReady,
			wantErrIs: true,
		},
		{
			name:     "route with admitted ingress",
			platform: cluster.OpenDataHub,
			routes: []routev1.Route{
				{
					ObjectMeta: metav1.ObjectMeta{Name: "dashboard", Namespace: namespace, Labels: partOfLabel},
					Status: routev1.RouteStatus{
						Ingress: []routev1.RouteIngress{
							{
								Host: "dashboard.apps.example.com",
								Conditions: []routev1.RouteIngressCondition{
									{Type: routev1.RouteAdmitted, Status: "True"},
								},
							},
						},
					},
				},
			},
			wantURL: "https://dashboard.apps.example.com",
		},
		{
			name:     "route with non-admitted ingress",
			platform: cluster.SelfManagedRhoai,
			routes: []routev1.Route{
				{
					ObjectMeta: metav1.ObjectMeta{Name: "dashboard", Namespace: namespace, Labels: partOfLabel},
					Status: routev1.RouteStatus{
						Ingress: []routev1.RouteIngress{
							{
								Host: "dashboard.apps.example.com",
								Conditions: []routev1.RouteIngressCondition{
									{Type: routev1.RouteAdmitted, Status: "False"},
								},
							},
						},
					},
				},
			},
			wantErr:   ErrDashboardRouteNotReady,
			wantErrIs: true,
		},
		{
			name:     "multiple routes",
			platform: cluster.OpenDataHub,
			routes: []routev1.Route{
				{ObjectMeta: metav1.ObjectMeta{Name: "r1", Namespace: namespace, Labels: partOfLabel}},
				{ObjectMeta: metav1.ObjectMeta{Name: "r2", Namespace: namespace, Labels: partOfLabel}},
			},
			wantErr:   ErrDashboardRouteNotReady,
			wantErrIs: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			objs := make([]runtime.Object, 0, len(tt.routes))
			for i := range tt.routes {
				objs = append(objs, &tt.routes[i])
			}

			cli := fake.NewClientBuilder().
				WithScheme(scheme).
				WithRuntimeObjects(objs...).
				Build()

			url, err := extractDashboardURL(context.Background(), cli, namespace, tt.platform)
			if tt.wantErrIs {
				assert.ErrorIs(t, err, tt.wantErr)
				assert.Empty(t, url)
			} else if tt.wantErr != nil {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.wantURL, url)
			}
		})
	}
}
