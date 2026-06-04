package controller_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	routev1 "github.com/openshift/api/route/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

const testNamespace = "test-ns"

func testScheme(t *testing.T) *runtime.Scheme {
	t.Helper()

	s := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(s))
	require.NoError(t, v1alpha1.AddToScheme(s))
	require.NoError(t, routev1.AddToScheme(s))

	return s
}

func createMinimalManifests(t *testing.T) string {
	t.Helper()

	base := t.TempDir()
	overlay := filepath.Join(base, "odh")
	require.NoError(t, os.MkdirAll(overlay, 0755))

	kustomization := `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - configmap.yaml
`
	configmap := `apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
data:
  key: value
`
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "kustomization.yaml"), []byte(kustomization), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "configmap.yaml"), []byte(configmap), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "params.env"), []byte(""), 0644))

	return base
}

func admittedRoute(namespace string) *routev1.Route {
	return &routev1.Route{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "dashboard",
			Namespace: namespace,
			Labels:    map[string]string{labels.PlatformPartOf: "dashboard"},
		},
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
	}
}

func TestReconcile_NotFound(t *testing.T) {
	s := testScheme(t)
	cli := fake.NewClientBuilder().WithScheme(s).Build()

	r := &ctrlpkg.DashboardReconciler{
		Client:                cli,
		Scheme:                s,
		ManifestsBasePath:     t.TempDir(),
		Platform:              cluster.OpenDataHub,
		Namespace:             testNamespace,
		ApplicationsNamespace: testNamespace,
	}

	result, err := r.Reconcile(context.Background(), ctrl.Request{
		NamespacedName: types.NamespacedName{Name: "nonexistent"},
	})

	require.NoError(t, err)
	assert.Equal(t, ctrl.Result{}, result)
}

func TestReconcile(t *testing.T) {
	registrySize := len(ctrlpkg.ModuleNames())

	tests := []struct {
		name             string
		generation       int64
		dashboardSpec    *v1alpha1.DashboardSpec
		manifestsBase    func(t *testing.T) string
		extraObjects     func(t *testing.T) []client.Object
		wantErr          bool
		wantRequeue      time.Duration
		wantPhase        common.Phase
		wantReady        *bool
		wantProvisioned  *bool
		wantURL          string
		wantGeneration   int64
		wantModuleCount  int
		wantModulePhases map[string]v1alpha1.ModulePhase
	}{
		{
			name:       "success with admitted route",
			generation: 3,
			manifestsBase: func(t *testing.T) string {
				return createMinimalManifests(t)
			},
			extraObjects: func(t *testing.T) []client.Object {
				return []client.Object{admittedRoute(testNamespace)}
			},
			wantPhase:       common.PhaseReady,
			wantReady:       boolPtr(true),
			wantProvisioned: boolPtr(true),
			wantURL:         "https://dashboard.apps.example.com",
			wantGeneration:  3,
		},
		{
			name:       "kustomize failure",
			generation: 1,
			manifestsBase: func(t *testing.T) string {
				return "/nonexistent/path"
			},
			wantErr:         true,
			wantPhase:       common.PhaseNotReady,
			wantProvisioned: boolPtr(false),
			wantGeneration:  1,
		},
		{
			name:       "route not ready requeues",
			generation: 2,
			manifestsBase: func(t *testing.T) string {
				return createMinimalManifests(t)
			},
			wantRequeue:     10 * time.Second,
			wantPhase:       common.PhaseNotReady,
			wantReady:       boolPtr(false),
			wantProvisioned: boolPtr(true),
			wantGeneration:  2,
			wantModuleCount: registrySize,
		},
		{
			name:       "observed generation matches CR",
			generation: 42,
			manifestsBase: func(t *testing.T) string {
				return createMinimalManifests(t)
			},
			wantRequeue:     10 * time.Second,
			wantPhase:       common.PhaseNotReady,
			wantReady:       boolPtr(false),
			wantProvisioned: boolPtr(true),
			wantGeneration:  42,
			wantModuleCount: registrySize,
		},
		{
			name:       "module statuses populated with components",
			generation: 1,
			dashboardSpec: &v1alpha1.DashboardSpec{
				Components: map[string]v1alpha1.ComponentAvailability{
					"modelregistry": {ManagementState: "Managed"},
				},
			},
			manifestsBase: func(t *testing.T) string {
				return createMinimalManifests(t)
			},
			extraObjects: func(t *testing.T) []client.Object {
				return []client.Object{admittedRoute(testNamespace)}
			},
			wantPhase:       common.PhaseReady,
			wantReady:       boolPtr(true),
			wantProvisioned: boolPtr(true),
			wantURL:         "https://dashboard.apps.example.com",
			wantGeneration:  1,
			wantModuleCount: registrySize,
			wantModulePhases: map[string]v1alpha1.ModulePhase{
				"modelRegistry":  v1alpha1.ModulePhaseDeployed,
				"genAi":          v1alpha1.ModulePhaseDeployed,
				"mlflow":         v1alpha1.ModulePhaseNotDeployed,
				"mlflowEmbedded": v1alpha1.ModulePhaseNotDeployed,
				"perses":         v1alpha1.ModulePhaseNotDeployed,
			},
		},
		{
			name:       "operator config reconcile interval applied",
			generation: 1,
			manifestsBase: func(t *testing.T) string {
				return createMinimalManifests(t)
			},
			extraObjects: func(t *testing.T) []client.Object {
				return []client.Object{
					admittedRoute(testNamespace),
					&corev1.ConfigMap{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "dashboard-operator-config",
							Namespace: testNamespace,
						},
						Data: map[string]string{
							"reconcileInterval": "30s",
						},
					},
				}
			},
			wantRequeue:     30 * time.Second,
			wantPhase:       common.PhaseReady,
			wantReady:       boolPtr(true),
			wantProvisioned: boolPtr(true),
			wantURL:         "https://dashboard.apps.example.com",
			wantGeneration:  1,
			wantModuleCount: registrySize,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := testScheme(t)

			dashboard := &v1alpha1.Dashboard{
				ObjectMeta: metav1.ObjectMeta{
					Name:       v1alpha1.DashboardInstanceName,
					Generation: tt.generation,
					Finalizers: []string{"components.platform.opendatahub.io/cleanup"},
				},
			}
			if tt.dashboardSpec != nil {
				dashboard.Spec = *tt.dashboardSpec
			}

			builder := fake.NewClientBuilder().
				WithScheme(s).
				WithObjects(dashboard).
				WithStatusSubresource(dashboard)

			if tt.extraObjects != nil {
				builder = builder.WithObjects(tt.extraObjects(t)...)
			}

			cli := builder.Build()

			r := &ctrlpkg.DashboardReconciler{
				Client:                cli,
				Scheme:                s,
				ManifestsBasePath:     tt.manifestsBase(t),
				Platform:              cluster.OpenDataHub,
				Namespace:             testNamespace,
				ApplicationsNamespace: testNamespace,
			}

			result, err := r.Reconcile(context.Background(), ctrl.Request{
				NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName},
			})

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
			}
			assert.Equal(t, tt.wantRequeue, result.RequeueAfter)

			updated := &v1alpha1.Dashboard{}
			require.NoError(t, cli.Get(context.Background(), types.NamespacedName{Name: v1alpha1.DashboardInstanceName}, updated))

			assert.Equal(t, tt.wantGeneration, updated.Status.ObservedGeneration)

			if tt.wantPhase != "" {
				assert.Equal(t, tt.wantPhase, updated.Status.Phase)
			}
			if tt.wantReady != nil {
				if *tt.wantReady {
					assert.True(t, conditions.IsStatusConditionTrue(updated, string(common.ConditionTypeReady)))
				} else {
					assert.True(t, conditions.IsStatusConditionFalse(updated, string(common.ConditionTypeReady)))
				}
			}
			if tt.wantProvisioned != nil {
				if *tt.wantProvisioned {
					assert.True(t, conditions.IsStatusConditionTrue(updated, string(common.ConditionTypeProvisioningSucceeded)))
				} else {
					assert.True(t, conditions.IsStatusConditionFalse(updated, string(common.ConditionTypeProvisioningSucceeded)))
				}
			}
			if tt.wantURL != "" {
				assert.Equal(t, tt.wantURL, updated.Status.URL)
			} else {
				assert.Empty(t, updated.Status.URL)
			}

			require.NotEmpty(t, updated.GetReleaseStatus().Releases)
			assert.Equal(t, v1alpha1.DashboardComponentName, updated.GetReleaseStatus().Releases[0].Name)

			if tt.wantModuleCount > 0 {
				assert.Len(t, updated.Status.ModuleStatuses, tt.wantModuleCount, "module status count")
			}
			for name, wantPhase := range tt.wantModulePhases {
				ms, ok := updated.Status.ModuleStatuses[name]
				require.True(t, ok, "module %q should be in status", name)
				assert.Equal(t, wantPhase, ms.Phase, "module %q phase", name)
			}
		})
	}
}

func TestReconcile_Deletion(t *testing.T) {
	s := testScheme(t)

	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{
			Name:       v1alpha1.DashboardInstanceName,
			Finalizers: []string{"components.platform.opendatahub.io/cleanup"},
			DeletionTimestamp: &metav1.Time{
				Time: time.Now(),
			},
		},
	}

	cli := fake.NewClientBuilder().
		WithScheme(s).
		WithObjects(dashboard).
		WithStatusSubresource(dashboard).
		Build()

	r := &ctrlpkg.DashboardReconciler{
		Client:                cli,
		Scheme:                s,
		ManifestsBasePath:     t.TempDir(),
		Platform:              cluster.OpenDataHub,
		Namespace:             testNamespace,
		ApplicationsNamespace: testNamespace,
	}

	result, err := r.Reconcile(context.Background(), ctrl.Request{
		NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName},
	})

	require.NoError(t, err)
	assert.Equal(t, ctrl.Result{}, result)

	updated := &v1alpha1.Dashboard{}
	err = cli.Get(context.Background(), types.NamespacedName{Name: v1alpha1.DashboardInstanceName}, updated)
	if err == nil {
		assert.Empty(t, updated.Finalizers, "finalizer should be removed after deletion")
	}
}

func TestReconcile_DistinctNamespaces(t *testing.T) {
	s := testScheme(t)

	operatorNS := "operator-ns"
	appNS := "application-ns"

	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{
			Name:       v1alpha1.DashboardInstanceName,
			Generation: 1,
			Finalizers: []string{"components.platform.opendatahub.io/cleanup"},
		},
	}

	builder := fake.NewClientBuilder().
		WithScheme(s).
		WithObjects(dashboard).
		WithStatusSubresource(dashboard).
		WithObjects(admittedRoute(appNS))

	cli := builder.Build()

	base := t.TempDir()
	overlay := filepath.Join(base, "odh")
	require.NoError(t, os.MkdirAll(overlay, 0755))

	kustomization := `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - configmap.yaml
`
	configmap := `apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
data:
  key: value
`
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "kustomization.yaml"), []byte(kustomization), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "configmap.yaml"), []byte(configmap), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "params.env"), []byte(""), 0644))

	r := &ctrlpkg.DashboardReconciler{
		Client:                cli,
		Scheme:                s,
		ManifestsBasePath:     base,
		Platform:              cluster.OpenDataHub,
		Namespace:             operatorNS,
		ApplicationsNamespace: appNS,
	}

	result, err := r.Reconcile(context.Background(), ctrl.Request{
		NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName},
	})

	require.NoError(t, err)
	assert.Zero(t, result.RequeueAfter)

	updated := &v1alpha1.Dashboard{}
	require.NoError(t, cli.Get(context.Background(), types.NamespacedName{Name: v1alpha1.DashboardInstanceName}, updated))
	assert.Equal(t, "https://dashboard.apps.example.com", updated.Status.URL)
}

func boolPtr(b bool) *bool {
	return &b
}
