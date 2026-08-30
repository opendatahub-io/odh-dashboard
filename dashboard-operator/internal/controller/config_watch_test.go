package controller_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/event"

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
			old:     newConfigMap(distributionConfigMapName, testNamespace, map[string]string{"platformVersion": "2.20.0"}, nil),
			updated: newConfigMap(distributionConfigMapName, testNamespace, map[string]string{"platformVersion": "2.20.0"}, nil),
			want:    false,
		},
		{
			name:    "annotation change fires a reconcile",
			old:     newConfigMap(distributionConfigMapName, testNamespace, map[string]string{"platformVersion": "2.20.0"}, nil),
			updated: newConfigMap(distributionConfigMapName, testNamespace, map[string]string{"platformVersion": "2.20.0"}, map[string]string{"platform.opendatahub.io/version": "2.21.0"}),
			want:    true,
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
