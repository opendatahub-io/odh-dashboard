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

	modArch := filepath.Join(dir, "modular-architecture")
	require.NoError(t, os.MkdirAll(modArch, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(modArch, "params.env"),
		[]byte("model-registry-ui-image=quay.io/default:main\ngen-ai-ui-image=quay.io/default:main\n"), 0644))

	t.Setenv("RELATED_IMAGE_ODH_MOD_ARCH_MODEL_REGISTRY_IMAGE", "quay.io/mr:prod")

	dashboard := &v1alpha1.Dashboard{
		Spec: v1alpha1.DashboardSpec{
			Gateway: &v1alpha1.GatewaySpec{Domain: "rh-ai.apps.test.com"},
		},
	}

	manifests := manifestSets(dir, cluster.SelfManagedRhoai)
	require.NoError(t, applyKustomizeParams(dashboard, manifests, cluster.SelfManagedRhoai))

	overlayData, err := os.ReadFile(filepath.Join(overlay, "params.env"))
	require.NoError(t, err)
	overlayContent := string(overlayData)
	assert.Contains(t, overlayContent, "gateway-domain=rh-ai.apps.test.com")
	assert.Contains(t, overlayContent, "dashboard-url=https://rh-ai.apps.test.com/")
	assert.Contains(t, overlayContent, "section-title=OpenShift Self Managed Services")
	assert.Contains(t, overlayContent, "existing-key=existing-value")

	modArchData, err := os.ReadFile(filepath.Join(modArch, "params.env"))
	require.NoError(t, err)
	modArchContent := string(modArchData)
	assert.Contains(t, modArchContent, "model-registry-ui-image=quay.io/mr:prod",
		"RELATED_IMAGE env var should override default in modular-architecture params.env")
	assert.Contains(t, modArchContent, "gen-ai-ui-image=quay.io/default:main",
		"unset RELATED_IMAGE should preserve existing default")
	assert.Contains(t, modArchContent, "gateway-domain=rh-ai.apps.test.com",
		"computed params should also be written to modular-architecture")
}

func TestExtractDashboardURL(t *testing.T) {
	scheme := runtime.NewScheme()
	require.NoError(t, routev1.AddToScheme(scheme))

	namespace := "test-ns"
	partOfLabel := map[string]string{labels.PlatformPartOf: "dashboard"}

	tests := []struct {
		name      string
		dashboard *v1alpha1.Dashboard
		platform  cluster.Platform
		routes    []routev1.Route
		wantURL   string
		wantErr   error
		wantErrIs bool
	}{
		{
			name:      "xKS platform returns empty URL without error",
			dashboard: &v1alpha1.Dashboard{},
			platform:  cluster.XKS,
		},
		{
			name: "gateway domain takes priority over routes",
			dashboard: &v1alpha1.Dashboard{
				Spec: v1alpha1.DashboardSpec{
					Gateway: &v1alpha1.GatewaySpec{Domain: "rh-ai.apps.example.com"},
				},
			},
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
			wantURL: "https://rh-ai.apps.example.com/",
		},
		{
			name:      "no gateway domain falls back to routes - no routes",
			dashboard: &v1alpha1.Dashboard{},
			platform:  cluster.OpenDataHub,
			routes:    nil,
			wantErr:   ErrDashboardRouteNotReady,
			wantErrIs: true,
		},
		{
			name:      "route without ingress",
			dashboard: &v1alpha1.Dashboard{},
			platform:  cluster.OpenDataHub,
			routes: []routev1.Route{
				{
					ObjectMeta: metav1.ObjectMeta{Name: "dashboard", Namespace: namespace, Labels: partOfLabel},
				},
			},
			wantErr:   ErrDashboardRouteNotReady,
			wantErrIs: true,
		},
		{
			name:      "route with admitted ingress",
			dashboard: &v1alpha1.Dashboard{},
			platform:  cluster.OpenDataHub,
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
			name:      "route with non-admitted ingress",
			dashboard: &v1alpha1.Dashboard{},
			platform:  cluster.SelfManagedRhoai,
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
			name:      "multiple routes",
			dashboard: &v1alpha1.Dashboard{},
			platform:  cluster.OpenDataHub,
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

			url, err := extractDashboardURL(context.Background(), cli, tt.dashboard, namespace, tt.platform)
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
