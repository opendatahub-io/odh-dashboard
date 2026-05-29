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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
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

func TestReconcile_NotFound(t *testing.T) {
	s := testScheme(t)
	cli := fake.NewClientBuilder().
		WithScheme(s).
		Build()

	r := &controller.DashboardReconciler{
		Client:            cli,
		Scheme:            s,
		ManifestsBasePath: t.TempDir(),
		Platform:          cluster.OpenDataHub,
		Namespace:         testNamespace,
	}

	result, err := r.Reconcile(context.Background(), ctrl.Request{
		NamespacedName: types.NamespacedName{Name: "nonexistent"},
	})

	require.NoError(t, err)
	assert.Equal(t, ctrl.Result{}, result)
}

func TestReconcile_Success(t *testing.T) {
	s := testScheme(t)
	manifestsBase := createMinimalManifests(t)

	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{
			Name:       v1alpha1.DashboardInstanceName,
			Generation: 3,
		},
	}

	route := &routev1.Route{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "dashboard",
			Namespace: testNamespace,
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

	cli := fake.NewClientBuilder().
		WithScheme(s).
		WithObjects(dashboard, route).
		WithStatusSubresource(dashboard).
		Build()

	r := &controller.DashboardReconciler{
		Client:            cli,
		Scheme:            s,
		ManifestsBasePath: manifestsBase,
		Platform:          cluster.OpenDataHub,
		Namespace:         testNamespace,
	}

	result, err := r.Reconcile(context.Background(), ctrl.Request{
		NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName},
	})

	require.NoError(t, err)
	assert.Equal(t, time.Duration(0), result.RequeueAfter)

	updated := &v1alpha1.Dashboard{}
	require.NoError(t, cli.Get(context.Background(), types.NamespacedName{Name: v1alpha1.DashboardInstanceName}, updated))

	assert.Equal(t, int64(3), updated.Status.ObservedGeneration)
	assert.Equal(t, common.PhaseReady, updated.Status.Phase)
	assert.Equal(t, "https://dashboard.apps.example.com", updated.Status.URL)

	assert.True(t, conditions.IsStatusConditionTrue(updated, string(common.ConditionTypeReady)))
	assert.True(t, conditions.IsStatusConditionTrue(updated, string(common.ConditionTypeProvisioningSucceeded)))

	require.NotEmpty(t, updated.GetReleaseStatus().Releases)
	assert.Equal(t, v1alpha1.DashboardComponentName, updated.GetReleaseStatus().Releases[0].Name)
}

func TestReconcile_KustomizeFailure(t *testing.T) {
	s := testScheme(t)

	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{
			Name:       v1alpha1.DashboardInstanceName,
			Generation: 1,
		},
	}

	cli := fake.NewClientBuilder().
		WithScheme(s).
		WithObjects(dashboard).
		WithStatusSubresource(dashboard).
		Build()

	r := &controller.DashboardReconciler{
		Client:            cli,
		Scheme:            s,
		ManifestsBasePath: "/nonexistent/path",
		Platform:          cluster.OpenDataHub,
		Namespace:         testNamespace,
	}

	_, err := r.Reconcile(context.Background(), ctrl.Request{
		NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName},
	})

	assert.Error(t, err)

	updated := &v1alpha1.Dashboard{}
	require.NoError(t, cli.Get(context.Background(), types.NamespacedName{Name: v1alpha1.DashboardInstanceName}, updated))

	assert.Equal(t, common.PhaseNotReady, updated.Status.Phase)
	assert.True(t, conditions.IsStatusConditionFalse(updated, string(common.ConditionTypeProvisioningSucceeded)))
}

func TestReconcile_RouteNotReady(t *testing.T) {
	s := testScheme(t)
	manifestsBase := createMinimalManifests(t)

	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{
			Name:       v1alpha1.DashboardInstanceName,
			Generation: 2,
		},
	}

	cli := fake.NewClientBuilder().
		WithScheme(s).
		WithObjects(dashboard).
		WithStatusSubresource(dashboard).
		Build()

	r := &controller.DashboardReconciler{
		Client:            cli,
		Scheme:            s,
		ManifestsBasePath: manifestsBase,
		Platform:          cluster.OpenDataHub,
		Namespace:         testNamespace,
	}

	result, err := r.Reconcile(context.Background(), ctrl.Request{
		NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName},
	})

	require.NoError(t, err)
	assert.Equal(t, 10*time.Second, result.RequeueAfter)

	updated := &v1alpha1.Dashboard{}
	require.NoError(t, cli.Get(context.Background(), types.NamespacedName{Name: v1alpha1.DashboardInstanceName}, updated))

	assert.Equal(t, int64(2), updated.Status.ObservedGeneration)
	assert.True(t, conditions.IsStatusConditionTrue(updated, string(common.ConditionTypeProvisioningSucceeded)))
}

func TestReconcile_ObservedGenerationSetEarly(t *testing.T) {
	s := testScheme(t)
	manifestsBase := createMinimalManifests(t)

	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{
			Name:       v1alpha1.DashboardInstanceName,
			Generation: 42,
		},
	}

	cli := fake.NewClientBuilder().
		WithScheme(s).
		WithObjects(dashboard).
		WithStatusSubresource(dashboard).
		Build()

	r := &controller.DashboardReconciler{
		Client:            cli,
		Scheme:            s,
		ManifestsBasePath: manifestsBase,
		Platform:          cluster.OpenDataHub,
		Namespace:         testNamespace,
	}

	_, err := r.Reconcile(context.Background(), ctrl.Request{
		NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName},
	})
	require.NoError(t, err)

	updated := &v1alpha1.Dashboard{}
	require.NoError(t, cli.Get(context.Background(), types.NamespacedName{Name: v1alpha1.DashboardInstanceName}, updated))

	assert.Equal(t, int64(42), updated.Status.ObservedGeneration,
		"ObservedGeneration must match the CR's metadata.generation")
}
