package controller

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	routev1 "github.com/openshift/api/route/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
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
	assert.Contains(t, overlayContent, "model-registry-ui-image=quay.io/mr:prod",
		"RELATED_IMAGE env var should be written to overlay params.env")
}

func TestApplyKustomizeParamsPreservesDigestDefaults(t *testing.T) {
	dir := t.TempDir()
	overlay := filepath.Join(dir, "rhoai")
	require.NoError(t, os.MkdirAll(overlay, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "params.env"),
		[]byte("odh-dashboard-image=quay.io/opendatahub/odh-dashboard@sha256:abc123\nkube-rbac-proxy=quay.io/opendatahub/odh-kube-rbac-proxy@sha256:def456\n"), 0644))

	for _, envVar := range imagesMap {
		t.Setenv(envVar, "")
	}

	dashboard := &v1alpha1.Dashboard{}
	manifests := manifestSets(dir, cluster.SelfManagedRhoai)
	require.NoError(t, applyKustomizeParams(dashboard, manifests, cluster.SelfManagedRhoai))

	overlayData, err := os.ReadFile(filepath.Join(overlay, "params.env"))
	require.NoError(t, err)
	overlayContent := string(overlayData)
	assert.Contains(t, overlayContent, "odh-dashboard-image=quay.io/opendatahub/odh-dashboard@sha256:abc123",
		"digest-pinned default from params.env must survive when no env var override is provided")
	assert.Contains(t, overlayContent, "kube-rbac-proxy=quay.io/opendatahub/odh-kube-rbac-proxy@sha256:def456",
		"digest-pinned default from params.env must survive when no env var override is provided")
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

func TestRemapRayDashboardGatewayRBAC(t *testing.T) {
	resources := []unstructured.Unstructured{
		{
			Object: map[string]interface{}{
				"apiVersion": "rbac.authorization.k8s.io/v1",
				"kind":       "Role",
				"metadata": map[string]interface{}{
					"name":      rayDataScienceGatewayRBACName,
					"namespace": "opendatahub",
				},
			},
		},
		{
			Object: map[string]interface{}{
				"apiVersion": "rbac.authorization.k8s.io/v1",
				"kind":       "RoleBinding",
				"metadata": map[string]interface{}{
					"name":      rayDataScienceGatewayRBACName,
					"namespace": "opendatahub",
				},
			},
		},
		{
			Object: map[string]interface{}{
				"apiVersion": "rbac.authorization.k8s.io/v1",
				"kind":       "Role",
				"metadata": map[string]interface{}{
					"name":      "fetch-ray-httproutes-role",
					"namespace": "opendatahub",
				},
			},
		},
	}

	remapRayDashboardGatewayRBAC(resources)

	assert.Equal(t, dataScienceGatewayNamespace, resources[0].GetNamespace())
	assert.Equal(t, dataScienceGatewayNamespace, resources[1].GetNamespace())
	assert.Equal(t, "opendatahub", resources[2].GetNamespace())
}

func TestRemapDataConnectHubGatewayRBAC(t *testing.T) {
	resources := []unstructured.Unstructured{
		{Object: map[string]interface{}{
			"kind": "Role", "metadata": map[string]interface{}{"name": dchRhoaiGatewayRBACName},
		}},
		{Object: map[string]interface{}{
			"kind": "RoleBinding", "metadata": map[string]interface{}{"name": dchRhoaiGatewayRBACName},
			"subjects": []interface{}{map[string]interface{}{"kind": "ServiceAccount", "name": "odh-dashboard-data-connect-hub-ui"}},
		}},
		{Object: map[string]interface{}{
			"kind": "Role", "metadata": map[string]interface{}{"name": dchOdhGatewayRBACName},
		}},
		{Object: map[string]interface{}{
			"kind": "RoleBinding", "metadata": map[string]interface{}{"name": dchOdhGatewayRBACName},
			"subjects": []interface{}{map[string]interface{}{"kind": "ServiceAccount", "name": "odh-dashboard-data-connect-hub-ui"}},
		}},
	}

	remapDataConnectHubGatewayRBAC(resources, "redhat-ods-applications")

	assert.Equal(t, dataScienceGatewayNamespace, resources[0].GetNamespace())
	assert.Equal(t, dataScienceGatewayNamespace, resources[1].GetNamespace())
	assert.Equal(t, odhGatewayNamespace, resources[2].GetNamespace())
	assert.Equal(t, odhGatewayNamespace, resources[3].GetNamespace())

	for _, resource := range []unstructured.Unstructured{resources[1], resources[3]} {
		subjects, found, err := unstructured.NestedSlice(resource.Object, "subjects")
		require.NoError(t, err)
		require.True(t, found)
		subject := subjects[0].(map[string]interface{})
		assert.Equal(t, "redhat-ods-applications", subject["namespace"])
	}
}

func TestFilterAndRemapDataConnectHubGatewayRBAC(t *testing.T) {
	makeResources := func() []unstructured.Unstructured {
		return []unstructured.Unstructured{
			{Object: map[string]interface{}{
				"kind": "Role", "metadata": map[string]interface{}{"name": dchRhoaiGatewayRBACName},
			}},
			{Object: map[string]interface{}{
				"kind": "RoleBinding", "metadata": map[string]interface{}{"name": dchRhoaiGatewayRBACName},
				"subjects": []interface{}{map[string]interface{}{"kind": "ServiceAccount", "name": "odh-dashboard-data-connect-hub-ui"}},
			}},
			{Object: map[string]interface{}{
				"kind": "Role", "metadata": map[string]interface{}{"name": dchOdhGatewayRBACName},
			}},
			{Object: map[string]interface{}{
				"kind": "RoleBinding", "metadata": map[string]interface{}{"name": dchOdhGatewayRBACName},
				"subjects": []interface{}{map[string]interface{}{"kind": "ServiceAccount", "name": "odh-dashboard-data-connect-hub-ui"}},
			}},
			{Object: map[string]interface{}{
				"kind": "Deployment", "metadata": map[string]interface{}{"name": "data-connect-hub-ui"},
			}},
		}
	}

	t.Run("RHOAI keeps only RHOAI gateway resources in openshift-ingress", func(t *testing.T) {
		result := filterAndRemapDataConnectHubGatewayRBAC(makeResources(), "redhat-ods-applications", cluster.SelfManagedRhoai)

		require.Len(t, result, 3) // rhoai Role + RoleBinding + Deployment; ODH resources dropped
		assert.Equal(t, dchRhoaiGatewayRBACName, result[0].GetName())
		assert.Equal(t, dataScienceGatewayNamespace, result[0].GetNamespace())
		assert.Equal(t, dchRhoaiGatewayRBACName, result[1].GetName())
		assert.Equal(t, dataScienceGatewayNamespace, result[1].GetNamespace())
		assert.Equal(t, "data-connect-hub-ui", result[2].GetName())

		subjects, found, err := unstructured.NestedSlice(result[1].Object, "subjects")
		require.NoError(t, err)
		require.True(t, found)
		assert.Equal(t, "redhat-ods-applications", subjects[0].(map[string]interface{})["namespace"])
	})

	t.Run("Managed RHOAI keeps only RHOAI gateway resources", func(t *testing.T) {
		result := filterAndRemapDataConnectHubGatewayRBAC(makeResources(), "redhat-ods-applications", cluster.ManagedRhoai)

		require.Len(t, result, 3)
		assert.Equal(t, dchRhoaiGatewayRBACName, result[0].GetName())
		assert.Equal(t, dataScienceGatewayNamespace, result[0].GetNamespace())
		assert.Equal(t, dchRhoaiGatewayRBACName, result[1].GetName())
		assert.Equal(t, dataScienceGatewayNamespace, result[1].GetNamespace())
	})

	t.Run("ODH keeps only ODH gateway resources in opendatahub", func(t *testing.T) {
		result := filterAndRemapDataConnectHubGatewayRBAC(makeResources(), "opendatahub", cluster.OpenDataHub)

		require.Len(t, result, 3) // odh Role + RoleBinding + Deployment; RHOAI resources dropped
		assert.Equal(t, dchOdhGatewayRBACName, result[0].GetName())
		assert.Equal(t, odhGatewayNamespace, result[0].GetNamespace())
		assert.Equal(t, dchOdhGatewayRBACName, result[1].GetName())
		assert.Equal(t, odhGatewayNamespace, result[1].GetNamespace())
		assert.Equal(t, "data-connect-hub-ui", result[2].GetName())

		subjects, found, err := unstructured.NestedSlice(result[1].Object, "subjects")
		require.NoError(t, err)
		require.True(t, found)
		assert.Equal(t, "opendatahub", subjects[0].(map[string]interface{})["namespace"])
	})
}

func TestCleanupDataConnectHubGatewayRBAC(t *testing.T) {
	newResources := func() []client.Object {
		return []client.Object{
			&rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Name: dchRhoaiGatewayRBACName, Namespace: dataScienceGatewayNamespace}},
			&rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Name: dchRhoaiGatewayRBACName, Namespace: dataScienceGatewayNamespace}},
			&rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Name: dchOdhGatewayRBACName, Namespace: odhGatewayNamespace}},
			&rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Name: dchOdhGatewayRBACName, Namespace: odhGatewayNamespace}},
		}
	}
	tests := []struct {
		name     string
		keepName string
		keptName string
		keptNS   string
	}{
		{name: "ODH upgrade removes stale RHOAI RBAC", keepName: dchOdhGatewayRBACName, keptName: dchOdhGatewayRBACName, keptNS: odhGatewayNamespace},
		{name: "RHOAI upgrade removes stale ODH RBAC", keepName: dchRhoaiGatewayRBACName, keptName: dchRhoaiGatewayRBACName, keptNS: dataScienceGatewayNamespace},
		{name: "teardown removes both platform pairs"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			scheme := runtime.NewScheme()
			require.NoError(t, rbacv1.AddToScheme(scheme))
			cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(newResources()...).Build()
			r := &DashboardReconciler{Client: cli, Scheme: scheme}

			require.NoError(t, r.cleanupDataConnectHubGatewayRBAC(context.Background(), tt.keepName))
			require.NoError(t, r.cleanupDataConnectHubGatewayRBAC(context.Background(), tt.keepName), "cleanup should be idempotent")

			for _, resource := range newResources() {
				err := cli.Get(context.Background(), client.ObjectKeyFromObject(resource), resource)
				if resource.GetName() == tt.keptName && resource.GetNamespace() == tt.keptNS {
					require.NoError(t, err, "%T should be retained", resource)
				} else {
					assert.True(t, apierrors.IsNotFound(err), "%T should be deleted", resource)
				}
			}
		})
	}
}

func TestMonitoringNamespace(t *testing.T) {
	tests := []struct {
		name                  string
		platform              cluster.Platform
		applicationsNamespace string
		want                  string
	}{
		{
			name:                  "SelfManagedRhoai returns hardcoded monitoring namespace",
			platform:              cluster.SelfManagedRhoai,
			applicationsNamespace: "redhat-ods-applications",
			want:                  "redhat-ods-monitoring",
		},
		{
			name:                  "ManagedRhoai returns hardcoded monitoring namespace",
			platform:              cluster.ManagedRhoai,
			applicationsNamespace: "redhat-ods-applications",
			want:                  "redhat-ods-monitoring",
		},
		{
			name:                  "OpenDataHub returns applications namespace",
			platform:              cluster.OpenDataHub,
			applicationsNamespace: "opendatahub",
			want:                  "opendatahub",
		},
		{
			name:                  "XKS returns applications namespace",
			platform:              cluster.XKS,
			applicationsNamespace: "my-namespace",
			want:                  "my-namespace",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &DashboardReconciler{
				Platform:              tt.platform,
				ApplicationsNamespace: tt.applicationsNamespace,
			}
			assert.Equal(t, tt.want, r.monitoringNamespace())
		})
	}
}

func TestAutoDetectObservability(t *testing.T) {
	scheme := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(scheme))

	persesService := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      persesServiceName,
			Namespace: "redhat-ods-monitoring",
		},
		Spec: corev1.ServiceSpec{
			Ports: []corev1.ServicePort{{Port: 8080}},
		},
	}

	persesServiceODH := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      persesServiceName,
			Namespace: "opendatahub",
		},
		Spec: corev1.ServiceSpec{
			Ports: []corev1.ServicePort{{Port: 8080}},
		},
	}

	tests := []struct {
		name                  string
		platform              cluster.Platform
		applicationsNamespace string
		existingObs           *v1alpha1.ObservabilitySpec
		objects               []runtime.Object
		wantObs               *v1alpha1.ObservabilitySpec
		wantErr               bool
	}{
		{
			name:                  "explicit config present — no change",
			platform:              cluster.SelfManagedRhoai,
			applicationsNamespace: "redhat-ods-applications",
			existingObs: &v1alpha1.ObservabilitySpec{
				Enabled: true,
				PersesService: &v1alpha1.ServiceTarget{
					Name:      "custom-perses",
					Namespace: "custom-ns",
					Port:      9090,
				},
			},
			objects: []runtime.Object{persesService},
			wantObs: &v1alpha1.ObservabilitySpec{
				Enabled: true,
				PersesService: &v1alpha1.ServiceTarget{
					Name:      "custom-perses",
					Namespace: "custom-ns",
					Port:      9090,
				},
			},
		},
		{
			name:                  "service found RHOAI — populates observability",
			platform:              cluster.SelfManagedRhoai,
			applicationsNamespace: "redhat-ods-applications",
			objects:               []runtime.Object{persesService},
			wantObs: &v1alpha1.ObservabilitySpec{
				Enabled: true,
				PersesService: &v1alpha1.ServiceTarget{
					Name:      persesServiceName,
					Namespace: "redhat-ods-monitoring",
					Port:      persesServicePort,
				},
			},
		},
		{
			name:                  "service found ODH — populates with applications namespace",
			platform:              cluster.OpenDataHub,
			applicationsNamespace: "opendatahub",
			objects:               []runtime.Object{persesServiceODH},
			wantObs: &v1alpha1.ObservabilitySpec{
				Enabled: true,
				PersesService: &v1alpha1.ServiceTarget{
					Name:      persesServiceName,
					Namespace: "opendatahub",
					Port:      persesServicePort,
				},
			},
		},
		{
			name:                  "service not found — observability remains nil",
			platform:              cluster.SelfManagedRhoai,
			applicationsNamespace: "redhat-ods-applications",
			objects:               nil,
			wantObs:               nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cli := fake.NewClientBuilder().
				WithScheme(scheme).
				WithRuntimeObjects(tt.objects...).
				Build()

			r := &DashboardReconciler{
				Client:                cli,
				Platform:              tt.platform,
				ApplicationsNamespace: tt.applicationsNamespace,
			}

			dashboard := &v1alpha1.Dashboard{
				Spec: v1alpha1.DashboardSpec{
					Observability: tt.existingObs,
				},
			}

			err := r.autoDetectObservability(context.Background(), dashboard)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
			}

			assert.Equal(t, tt.wantObs, dashboard.Spec.Observability)
		})
	}
}

// TestDeployObservabilityManifests_PersesServiceRequired covers the InvalidConfig
// path. The CRD's CEL rule makes "enabled: true + persesService: nil" unadmittable
// by the API server, so this case is unreachable from envtest — it must be a unit
// test that constructs the Dashboard struct directly. (RHOAIENG-83647)
func TestDeployObservabilityManifests_PersesServiceRequired(t *testing.T) {
	scheme := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(scheme))
	cli := fake.NewClientBuilder().WithScheme(scheme).Build()

	dashboard := &v1alpha1.Dashboard{
		Spec: v1alpha1.DashboardSpec{
			Observability: &v1alpha1.ObservabilitySpec{
				Enabled:       true,
				PersesService: nil,
			},
		},
	}

	err := deployObservabilityManifests(context.Background(), cli, dashboard, "/base", cluster.OpenDataHub, "applications")
	assert.ErrorIs(t, err, ErrPersesServiceRequired)
}

func TestCleanupCrossNamespaceResources_PreserveObservabilityStillCleansDCH(t *testing.T) {
	scheme := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(scheme))
	require.NoError(t, rbacv1.AddToScheme(scheme))
	role := &rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Name: dchRhoaiGatewayRBACName, Namespace: dataScienceGatewayNamespace}}
	binding := &rbacv1.RoleBinding{ObjectMeta: role.ObjectMeta}
	configMap := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{
		Name: "perses-dashboard-config", Namespace: rhoaiMonitoringNamespace,
		Labels: map[string]string{labels.PlatformPartOf: "dashboard", moduleComponentLabel: observabilityComponent},
	}}
	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(role, binding, configMap).Build()
	r := &DashboardReconciler{Client: cli, Scheme: scheme}
	ctx := context.Background()

	require.NoError(t, r.cleanupCrossNamespaceResources(ctx, &v1alpha1.Dashboard{}, true))
	assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(role), role)))
	assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(binding), binding)))
	require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(configMap), configMap))
}

func TestReconcile_ObservabilityDetectionFailurePreservesResources(t *testing.T) {
	scheme := maasConsumerPortalScheme(t)
	base := t.TempDir()
	bundle := filepath.Join(base, "distributions", maasConsumerPortalDeploymentName)
	require.NoError(t, os.MkdirAll(bundle, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(bundle, "kustomization.yaml"), []byte(`apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - configmap.yaml
`), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(bundle, "configmap.yaml"), []byte(`apiVersion: v1
kind: ConfigMap
metadata:
  name: portal-bundle-config
data:
  key: updated
`), 0644))
	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName, Finalizers: []string{dashboardFinalizer}},
		Spec: v1alpha1.DashboardSpec{
			ManagementSpec:     common.ManagementSpec{ManagementState: "Removed"},
			Gateway:            &v1alpha1.GatewaySpec{Domain: "apps.example.com"},
			MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"},
		},
	}
	cm := maasConsumerPortalTestManager(t, dashboard)
	cm.MarkTrue(conditionMaaSConsumerPortalAvailable, conditions.WithReason("Deployed"))
	service := &corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: persesServiceName, Namespace: rhoaiMonitoringNamespace}}
	observability := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{
		Name: "perses-dashboard-config", Namespace: rhoaiMonitoringNamespace, UID: "existing-observability",
		Labels: map[string]string{labels.PlatformPartOf: "dashboard", moduleComponentLabel: observabilityComponent},
	}}
	federation := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalFederationConfigMapName, Namespace: "applications"},
		Data:       map[string]string{federationConfigKey: `[{"name":"perses","proxyService":[{"path":"/perses/api","service":{"name":"data-science-perses","namespace":"redhat-ods-monitoring","port":8080}}]}]`},
	}
	localObservability := observability.DeepCopy()
	localObservability.Namespace = "applications"
	localObservability.Labels = map[string]string{labels.PlatformPartOf: "dashboard"}
	coreConfig := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{
		Name: "dashboard-core-config", Namespace: "applications",
		Labels: map[string]string{labels.PlatformPartOf: "dashboard"},
	}}
	lookupFails := true
	cli := fake.NewClientBuilder().WithScheme(scheme).
		WithObjects(dashboard, service, observability, localObservability, federation, coreConfig).WithStatusSubresource(dashboard).
		WithInterceptorFuncs(interceptor.Funcs{
			Get: func(ctx context.Context, delegate client.WithWatch, key client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
				if _, isService := obj.(*corev1.Service); lookupFails && isService && key == client.ObjectKeyFromObject(service) {
					return assert.AnError
				}
				return delegate.Get(ctx, key, obj, opts...)
			},
		}).Build()
	r := &DashboardReconciler{Client: cli, Scheme: scheme, ManifestsBasePath: base, Platform: cluster.SelfManagedRhoai, ApplicationsNamespace: "applications"}
	ctx := context.Background()
	result, err := r.Reconcile(ctx, ctrl.Request{NamespacedName: client.ObjectKeyFromObject(dashboard)})
	require.NoError(t, err)
	assert.Positive(t, result.RequeueAfter)
	assert.LessOrEqual(t, result.RequeueAfter, observabilityRetryInterval)
	updated := &v1alpha1.Dashboard{}
	require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(dashboard), updated))
	condition := conditions.FindStatusCondition(updated, conditionObservabilityAvailable)
	require.NotNil(t, condition)
	assert.Equal(t, "DetectionFailed", condition.Reason)
	assert.Equal(t, common.PhaseNotReady, updated.Status.Phase)
	assert.False(t, conditions.IsStatusConditionTrue(updated, conditionMaaSConsumerPortalAvailable), "portal availability must be recalculated")
	assert.Equal(t, "Removed", conditions.FindStatusCondition(updated, string(common.ConditionTypeProvisioningSucceeded)).Reason)
	assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(coreConfig), &corev1.ConfigMap{})), "core teardown must proceed")
	portalConfig := &corev1.ConfigMap{}
	require.NoError(t, cli.Get(ctx, client.ObjectKey{Name: "portal-bundle-config", Namespace: "applications"}, portalConfig), "portal bundle reconciliation must proceed")
	assert.Equal(t, "updated", portalConfig.Data["key"])
	retained := &corev1.ConfigMap{}
	require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(observability), retained))
	assert.Equal(t, observability.UID, retained.UID)
	require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(localObservability), retained))
	assert.Equal(t, localObservability.UID, retained.UID)
	require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(federation), retained))
	assert.JSONEq(t, federation.Data[federationConfigKey], retained.Data[federationConfigKey])

	lookupFails = false
	obsOverlay := filepath.Join(base, "observability", "rhoai")
	require.NoError(t, os.MkdirAll(obsOverlay, 0755))
	require.NoError(t, os.CopyFS(obsOverlay, os.DirFS(bundle)))
	_, err = r.Reconcile(ctx, ctrl.Request{NamespacedName: client.ObjectKeyFromObject(dashboard)})
	require.NoError(t, err)
	require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(dashboard), updated))
	assert.Equal(t, "Deployed", conditions.FindStatusCondition(updated, conditionObservabilityAvailable).Reason)
	assert.Nil(t, updated.Spec.Observability, "auto-detection must not be persisted in the spec")
}

func TestReconcileObservability_APIFailuresRetry(t *testing.T) {
	for _, config := range []string{"explicit", "auto-detected"} {
		for _, failure := range []struct {
			reason string
			err    error
		}{
			{reason: "DeployFailed", err: assert.AnError},
			{reason: "PersesCRDNotFound", err: &meta.NoKindMatchError{GroupKind: persesdashboardGVK.GroupKind()}},
		} {
			t.Run(config+"/"+failure.reason, func(t *testing.T) {
				scheme := maasConsumerPortalScheme(t)
				service := &corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: persesServiceName, Namespace: rhoaiMonitoringNamespace}}
				cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(service).
					WithInterceptorFuncs(interceptor.Funcs{
						List: func(ctx context.Context, delegate client.WithWatch, list client.ObjectList, opts ...client.ListOption) error {
							if list.GetObjectKind().GroupVersionKind() == persesdashboardGVK {
								return failure.err
							}
							return delegate.List(ctx, list, opts...)
						},
					}).Build()
				r := &DashboardReconciler{Client: cli, Scheme: scheme, Platform: cluster.SelfManagedRhoai, ApplicationsNamespace: "applications"}
				dashboard := &v1alpha1.Dashboard{}
				if config == "explicit" {
					dashboard.Spec.Observability = &v1alpha1.ObservabilitySpec{
						Enabled: true, PersesService: &v1alpha1.ServiceTarget{Name: service.Name, Namespace: service.Namespace, Port: 8080},
					}
				} else {
					require.NoError(t, r.autoDetectObservability(context.Background(), dashboard))
				}
				cm := maasConsumerPortalTestManager(t, dashboard)
				assert.Equal(t, observabilityRetryInterval, r.reconcileObservability(context.Background(), dashboard, cm))
				condition := cm.GetCondition(conditionObservabilityAvailable)
				require.NotNil(t, condition)
				assert.Equal(t, metav1.ConditionFalse, condition.Status)
				assert.Equal(t, failure.reason, condition.Reason)
			})
		}
	}
}

func TestReconcileObservability_CleanupFailuresRetry(t *testing.T) {
	for _, operation := range []string{"list", "delete"} {
		t.Run(operation, func(t *testing.T) {
			scheme := maasConsumerPortalScheme(t)
			service := &corev1.Service{ObjectMeta: metav1.ObjectMeta{
				Name: "managed-observability", Namespace: "monitoring",
				Labels: map[string]string{labels.PlatformPartOf: "dashboard", moduleComponentLabel: observabilityComponent},
			}}
			failCleanup := true
			cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(service).
				WithInterceptorFuncs(interceptor.Funcs{
					List: func(ctx context.Context, delegate client.WithWatch, list client.ObjectList, opts ...client.ListOption) error {
						if failCleanup && operation == "list" {
							return assert.AnError
						}
						return delegate.List(ctx, list, opts...)
					},
					Delete: func(ctx context.Context, delegate client.WithWatch, obj client.Object, opts ...client.DeleteOption) error {
						if failCleanup && operation == "delete" {
							return assert.AnError
						}
						return delegate.Delete(ctx, obj, opts...)
					},
				}).Build()
			r := &DashboardReconciler{Client: cli, Scheme: scheme}
			dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{
				Observability: &v1alpha1.ObservabilitySpec{Enabled: false},
			}}
			cm := maasConsumerPortalTestManager(t, dashboard)
			ctx := context.Background()
			assert.Equal(t, observabilityRetryInterval, r.reconcileObservability(ctx, dashboard, cm))
			condition := cm.GetCondition(conditionObservabilityAvailable)
			require.NotNil(t, condition)
			assert.Equal(t, "CleanupFailed", condition.Reason)
			assert.Contains(t, condition.Message, assert.AnError.Error())
			require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(service), &corev1.Service{}))

			failCleanup = false
			assert.Zero(t, r.reconcileObservability(ctx, dashboard, cm))
			assert.Equal(t, "Disabled", cm.GetCondition(conditionObservabilityAvailable).Reason)
			assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(service), &corev1.Service{})))
		})
	}
}

func TestAutoDetectObservability_NonNotFoundError(t *testing.T) {
	scheme := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(scheme))

	injectedErr := assert.AnError
	cli := fake.NewClientBuilder().
		WithScheme(scheme).
		WithInterceptorFuncs(interceptor.Funcs{
			Get: func(ctx context.Context, c client.WithWatch, key client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
				return injectedErr
			},
		}).
		Build()

	r := &DashboardReconciler{
		Client:                cli,
		Platform:              cluster.SelfManagedRhoai,
		ApplicationsNamespace: "redhat-ods-applications",
	}

	dashboard := &v1alpha1.Dashboard{}
	err := r.autoDetectObservability(context.Background(), dashboard)

	assert.Error(t, err)
	assert.ErrorIs(t, err, injectedErr)
	assert.Nil(t, dashboard.Spec.Observability)
}
