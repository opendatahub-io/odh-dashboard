package controller_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/event"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/annotations"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

// distributionConfigMapName and operatorConfigMapName mirror the unexported
// constants in the controller package. Kept in sync with config.go.
const (
	distributionConfigMapName = "odh-dashboard-config"
	operatorConfigMapName     = "dashboard-operator-config"
)

func newConfigMap(name, namespace string, data, annotations map[string]string) *corev1.ConfigMap {
	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:        name,
			Namespace:   namespace,
			Annotations: annotations,
		},
		Data: data,
	}
}

func TestMapConfigMapToDashboard(t *testing.T) {
	r := &ctrlpkg.DashboardReconciler{Namespace: testNamespace}

	tests := []struct {
		name        string
		obj         *corev1.ConfigMap
		wantRequest bool
	}{
		{
			name:        "distribution config in operator namespace enqueues singleton",
			obj:         newConfigMap(distributionConfigMapName, testNamespace, nil, nil),
			wantRequest: true,
		},
		{
			name:        "operator config in operator namespace enqueues singleton",
			obj:         newConfigMap(operatorConfigMapName, testNamespace, nil, nil),
			wantRequest: true,
		},
		{
			name:        "watched name in a different namespace is ignored",
			obj:         newConfigMap(distributionConfigMapName, "other-ns", nil, nil),
			wantRequest: false,
		},
		{
			name:        "unrelated ConfigMap in operator namespace is ignored",
			obj:         newConfigMap("some-other-config", testNamespace, nil, nil),
			wantRequest: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reqs := r.MapConfigMapToDashboard(context.Background(), tt.obj)

			if !tt.wantRequest {
				assert.Empty(t, reqs)
				return
			}

			require.Len(t, reqs, 1)
			assert.Equal(t, v1alpha1.DashboardInstanceName, reqs[0].Name)
			assert.Empty(t, reqs[0].Namespace, "Dashboard is cluster-scoped, request should carry no namespace")
		})
	}
}

func TestConfigMapPredicate_CreateDeleteGeneric(t *testing.T) {
	r := &ctrlpkg.DashboardReconciler{Namespace: testNamespace}
	p := r.ConfigMapPredicate()

	watched := newConfigMap(distributionConfigMapName, testNamespace, nil, nil)
	wrongNS := newConfigMap(distributionConfigMapName, "other-ns", nil, nil)
	unrelated := newConfigMap("some-other-config", testNamespace, nil, nil)

	t.Run("create fires only for watched ConfigMaps in operator namespace", func(t *testing.T) {
		assert.True(t, p.Create(event.CreateEvent{Object: watched}))
		assert.False(t, p.Create(event.CreateEvent{Object: wrongNS}))
		assert.False(t, p.Create(event.CreateEvent{Object: unrelated}))
	})

	t.Run("delete fires only for watched ConfigMaps in operator namespace", func(t *testing.T) {
		assert.True(t, p.Delete(event.DeleteEvent{Object: watched}))
		assert.False(t, p.Delete(event.DeleteEvent{Object: wrongNS}))
		assert.False(t, p.Delete(event.DeleteEvent{Object: unrelated}))
	})

	t.Run("generic fires only for watched ConfigMaps in operator namespace", func(t *testing.T) {
		assert.True(t, p.Generic(event.GenericEvent{Object: watched}))
		assert.False(t, p.Generic(event.GenericEvent{Object: wrongNS}))
		assert.False(t, p.Generic(event.GenericEvent{Object: unrelated}))
	})
}

func TestConfigMapPredicate_Update(t *testing.T) {
	r := &ctrlpkg.DashboardReconciler{Namespace: testNamespace}
	p := r.ConfigMapPredicate()

	// metadata churn: identical Data and consumed annotations, but the object
	// metadata differs (resourceVersion bump + a rewritten label). The predicate
	// must ignore this — it is the exact regression the predicate guards against.
	churnOld := newConfigMap(distributionConfigMapName, testNamespace, map[string]string{"platformVersion": "2.20.0"}, nil)
	churnOld.ResourceVersion = "100"
	churnOld.Labels = map[string]string{"example.com/synced-at": "old"}
	churnNew := newConfigMap(distributionConfigMapName, testNamespace, map[string]string{"platformVersion": "2.20.0"}, nil)
	churnNew.ResourceVersion = "101"
	churnNew.Labels = map[string]string{"example.com/synced-at": "new"}

	tests := []struct {
		name    string
		old     *corev1.ConfigMap
		updated *corev1.ConfigMap
		want    bool
	}{
		{
			name:    "data change fires a reconcile",
			old:     newConfigMap(distributionConfigMapName, testNamespace, map[string]string{"platformVersion": "2.20.0"}, nil),
			updated: newConfigMap(distributionConfigMapName, testNamespace, map[string]string{"platformVersion": "2.21.0"}, nil),
			want:    true,
		},
		{
			name:    "identical data with only metadata churn does not fire",
			old:     churnOld,
			updated: churnNew,
			want:    false,
		},
		{
			name:    "consumed annotation change fires a reconcile",
			old:     newConfigMap(distributionConfigMapName, testNamespace, map[string]string{"platformVersion": "2.20.0"}, nil),
			updated: newConfigMap(distributionConfigMapName, testNamespace, map[string]string{"platformVersion": "2.20.0"}, map[string]string{annotations.PlatformVersion: "2.21.0"}),
			want:    true,
		},
		{
			// The PlatformType/PlatformVersion annotations are consumed only from
			// odh-dashboard-config; dashboard-operator-config contributes reconcile
			// inputs via Data alone, so an annotation change on it is a no-op.
			name:    "consumed annotation change on operator config does not fire",
			old:     newConfigMap(operatorConfigMapName, testNamespace, map[string]string{"reconcileInterval": "30s"}, nil),
			updated: newConfigMap(operatorConfigMapName, testNamespace, map[string]string{"reconcileInterval": "30s"}, map[string]string{annotations.PlatformVersion: "2.21.0"}),
			want:    false,
		},
		{
			name:    "operator config data change fires a reconcile",
			old:     newConfigMap(operatorConfigMapName, testNamespace, map[string]string{"reconcileInterval": "30s"}, nil),
			updated: newConfigMap(operatorConfigMapName, testNamespace, map[string]string{"reconcileInterval": "60s"}, nil),
			want:    true,
		},
		{
			name:    "unrelated annotation churn does not fire",
			old:     newConfigMap(distributionConfigMapName, testNamespace, map[string]string{"platformVersion": "2.20.0"}, map[string]string{"kubectl.kubernetes.io/last-applied-configuration": "{}"}),
			updated: newConfigMap(distributionConfigMapName, testNamespace, map[string]string{"platformVersion": "2.20.0"}, map[string]string{"kubectl.kubernetes.io/last-applied-configuration": "{\"data\":{}}"}),
			want:    false,
		},
		{
			name:    "unrelated ConfigMap does not fire even on data change",
			old:     newConfigMap("some-other-config", testNamespace, map[string]string{"a": "1"}, nil),
			updated: newConfigMap("some-other-config", testNamespace, map[string]string{"a": "2"}, nil),
			want:    false,
		},
		{
			name:    "watched name in a different namespace does not fire",
			old:     newConfigMap(distributionConfigMapName, "other-ns", map[string]string{"platformVersion": "2.20.0"}, nil),
			updated: newConfigMap(distributionConfigMapName, "other-ns", map[string]string{"platformVersion": "2.21.0"}, nil),
			want:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := p.Update(event.UpdateEvent{ObjectOld: tt.old, ObjectNew: tt.updated})
			assert.Equal(t, tt.want, got)
		})
	}
}

// TestConfigMapWatch_HonorsCustomDistributionConfigMapName verifies the watch
// tracks the resolved distribution config name rather than the hardcoded default.
// The distribution config ConfigMap name is user-settable (chart value
// config.name, plumbed in via OPERATOR_CONFIGMAP_NAME); readDistributionConfig /
// readPlatformVersion resolve it through resolveDistributionConfigMapName. If the
// watch kept the literal default, a non-default install would miss updates to its
// real ConfigMap and status.releases[platform].version would go stale — the exact
// failure this PR fixes (RHOAIENG-81919).
func TestConfigMapWatch_HonorsCustomDistributionConfigMapName(t *testing.T) {
	const customName = "custom-distribution-config"
	t.Setenv("OPERATOR_CONFIGMAP_NAME", customName)

	r := &ctrlpkg.DashboardReconciler{Namespace: testNamespace}
	p := r.ConfigMapPredicate()

	custom := newConfigMap(customName, testNamespace, map[string]string{"platformVersion": "2.20.0"}, nil)

	t.Run("map func enqueues for the custom-named ConfigMap", func(t *testing.T) {
		reqs := r.MapConfigMapToDashboard(context.Background(), custom)
		require.Len(t, reqs, 1)
		assert.Equal(t, v1alpha1.DashboardInstanceName, reqs[0].Name)
	})

	t.Run("the hardcoded default name is not watched once a custom name is set", func(t *testing.T) {
		def := newConfigMap(distributionConfigMapName, testNamespace, map[string]string{"platformVersion": "2.20.0"}, nil)
		assert.Empty(t, r.MapConfigMapToDashboard(context.Background(), def))
		assert.False(t, p.Create(event.CreateEvent{Object: def}))
	})

	t.Run("predicate fires on data change for the custom ConfigMap", func(t *testing.T) {
		assert.True(t, p.Create(event.CreateEvent{Object: custom}))
		updated := newConfigMap(customName, testNamespace, map[string]string{"platformVersion": "2.21.0"}, nil)
		assert.True(t, p.Update(event.UpdateEvent{ObjectOld: custom, ObjectNew: updated}))
	})

	t.Run("predicate fires on consumed annotation change for the custom ConfigMap", func(t *testing.T) {
		annoUpdated := newConfigMap(customName, testNamespace, map[string]string{"platformVersion": "2.20.0"}, map[string]string{annotations.PlatformVersion: "2.21.0"})
		assert.True(t, p.Update(event.UpdateEvent{ObjectOld: custom, ObjectNew: annoUpdated}))
	})
}
