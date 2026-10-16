package controller

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/event"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/annotations"
)

func TestAPIReaderPrefersAPIReaderAndFallsBackForUnitTests(t *testing.T) {
	scheme := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(scheme))

	cached := fake.NewClientBuilder().WithScheme(scheme).WithObjects(&corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: operatorConfigMapName, Namespace: "test-ns"},
		Data:       map[string]string{"reconcileInterval": "10s"},
	}).Build()
	direct := fake.NewClientBuilder().WithScheme(scheme).WithObjects(&corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: operatorConfigMapName, Namespace: "test-ns"},
		Data:       map[string]string{"reconcileInterval": "30s"},
	}).Build()

	r := &DashboardReconciler{Client: cached, APIReader: direct}
	assert.Equal(t, 30*time.Second, readOperatorConfig(context.Background(), r.apiReader(), "test-ns").ReconcileInterval)

	r.APIReader = nil
	assert.Equal(t, 10*time.Second, readOperatorConfig(context.Background(), r.apiReader(), "test-ns").ReconcileInterval)
}

func configTestScheme(t *testing.T) *runtime.Scheme {
	t.Helper()

	s := runtime.NewScheme()
	if err := clientgoscheme.AddToScheme(s); err != nil {
		t.Fatalf("failed to add client-go scheme: %v", err)
	}

	return s
}

func TestReadDistributionConfig(t *testing.T) {
	tests := []struct {
		name      string
		configMap *corev1.ConfigMap
		want      *v1alpha1.Distribution
		wantErr   bool
	}{
		{
			name:      "configmap does not exist",
			configMap: nil,
			want:      nil,
		},
		{
			name: "data keys only",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: distributionConfigMapName, Namespace: "test-ns"},
				Data: map[string]string{
					"distribution.name":    "Standalone",
					"distribution.version": "0.0.0",
				},
			},
			want: &v1alpha1.Distribution{Name: "Standalone", Version: "0.0.0"},
		},
		{
			name: "annotations only without data keys",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      distributionConfigMapName,
					Namespace: "test-ns",
					Annotations: map[string]string{
						annotations.PlatformType:    "OpenShift AI Self-Managed",
						annotations.PlatformVersion: "3.5.0",
					},
				},
			},
			want: &v1alpha1.Distribution{Name: "OpenShift AI Self-Managed", Version: "3.5.0"},
		},
		{
			name: "annotations override data keys",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      distributionConfigMapName,
					Namespace: "test-ns",
					Annotations: map[string]string{
						annotations.PlatformType:    "OpenShift AI Self-Managed",
						annotations.PlatformVersion: "3.5.0",
					},
				},
				Data: map[string]string{
					"distribution.name":    "Standalone",
					"distribution.version": "0.0.0",
				},
			},
			want: &v1alpha1.Distribution{Name: "OpenShift AI Self-Managed", Version: "3.5.0"},
		},
		{
			name: "partial annotation override - name only",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      distributionConfigMapName,
					Namespace: "test-ns",
					Annotations: map[string]string{
						annotations.PlatformType: "RHOAI",
					},
				},
				Data: map[string]string{
					"distribution.name":    "Standalone",
					"distribution.version": "1.0.0",
				},
			},
			want: &v1alpha1.Distribution{Name: "RHOAI", Version: "1.0.0"},
		},
		{
			name: "partial annotation override - version only",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      distributionConfigMapName,
					Namespace: "test-ns",
					Annotations: map[string]string{
						annotations.PlatformVersion: "3.5.0",
					},
				},
				Data: map[string]string{
					"distribution.name":    "Standalone",
					"distribution.version": "0.0.0",
				},
			},
			want: &v1alpha1.Distribution{Name: "Standalone", Version: "3.5.0"},
		},
		{
			name: "empty annotations do not override",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      distributionConfigMapName,
					Namespace: "test-ns",
					Annotations: map[string]string{
						annotations.PlatformType:    "",
						annotations.PlatformVersion: "",
					},
				},
				Data: map[string]string{
					"distribution.name":    "Standalone",
					"distribution.version": "1.0.0",
				},
			},
			want: &v1alpha1.Distribution{Name: "Standalone", Version: "1.0.0"},
		},
		{
			name: "nil data map with annotations",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      distributionConfigMapName,
					Namespace: "test-ns",
					Annotations: map[string]string{
						annotations.PlatformType:    "ODH",
						annotations.PlatformVersion: "2.0.0",
					},
				},
			},
			want: &v1alpha1.Distribution{Name: "ODH", Version: "2.0.0"},
		},
		{
			name: "both name and version empty returns nil",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: distributionConfigMapName, Namespace: "test-ns"},
				Data:       map[string]string{},
			},
			want: nil,
		},
		{
			name: "oversized annotation is truncated",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      distributionConfigMapName,
					Namespace: "test-ns",
					Annotations: map[string]string{
						annotations.PlatformType:    strings.Repeat("a", 300),
						annotations.PlatformVersion: strings.Repeat("b", 300),
					},
				},
			},
			want: &v1alpha1.Distribution{
				Name:    strings.Repeat("a", maxDistributionFieldLen),
				Version: strings.Repeat("b", maxDistributionFieldLen),
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := configTestScheme(t)
			builder := fake.NewClientBuilder().WithScheme(s)

			if tt.configMap != nil {
				builder = builder.WithObjects(tt.configMap)
			}

			cli := builder.Build()
			got, err := readDistributionConfig(context.Background(), cli, "test-ns")

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			assert.Equal(t, tt.want, got)
		})
	}
}

func TestReadPlatformVersion(t *testing.T) {
	tests := []struct {
		name      string
		configMap *corev1.ConfigMap
		want      string
		wantErr   bool
	}{
		{
			name:      "configmap does not exist",
			configMap: nil,
			want:      "",
		},
		{
			name: "platformVersion present",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: distributionConfigMapName, Namespace: "test-ns"},
				Data: map[string]string{
					"platformVersion": "2.20.0",
				},
			},
			want: "2.20.0",
		},
		{
			name: "platformVersion key missing",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: distributionConfigMapName, Namespace: "test-ns"},
				Data: map[string]string{
					"distribution.name": "SelfManagedRHOAI",
				},
			},
			want: "",
		},
		{
			name: "nil data map",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: distributionConfigMapName, Namespace: "test-ns"},
			},
			want: "",
		},
		{
			name: "oversized platformVersion is truncated",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: distributionConfigMapName, Namespace: "test-ns"},
				Data: map[string]string{
					"platformVersion": strings.Repeat("x", 300),
				},
			},
			want: strings.Repeat("x", maxDistributionFieldLen),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := configTestScheme(t)
			builder := fake.NewClientBuilder().WithScheme(s)

			if tt.configMap != nil {
				builder = builder.WithObjects(tt.configMap)
			}

			cli := builder.Build()
			got, err := readPlatformVersion(context.Background(), cli, "test-ns")

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			assert.Equal(t, tt.want, got)
		})
	}
}

func TestReadOperatorConfig(t *testing.T) {
	tests := []struct {
		name          string
		configMap     *corev1.ConfigMap
		wantReconcile time.Duration
	}{
		{
			name:          "configmap does not exist",
			configMap:     nil,
			wantReconcile: 0,
		},
		{
			name: "valid config",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: operatorConfigMapName, Namespace: "test-ns"},
				Data: map[string]string{
					"reconcileInterval": "30s",
				},
			},
			wantReconcile: 30 * time.Second,
		},
		{
			name: "invalid reconcile interval",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: operatorConfigMapName, Namespace: "test-ns"},
				Data: map[string]string{
					"reconcileInterval": "not-a-duration",
				},
			},
			wantReconcile: 0,
		},
		{
			name: "empty data",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: operatorConfigMapName, Namespace: "test-ns"},
				Data:       map[string]string{},
			},
			wantReconcile: 0,
		},
		{
			name: "nil data map",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: operatorConfigMapName, Namespace: "test-ns"},
			},
			wantReconcile: 0,
		},
		{
			name: "reconcile interval below minimum is ignored",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: operatorConfigMapName, Namespace: "test-ns"},
				Data: map[string]string{
					"reconcileInterval": "1ms",
				},
			},
			wantReconcile: 0,
		},
		{
			name: "reconcile interval at exact minimum is accepted",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: operatorConfigMapName, Namespace: "test-ns"},
				Data: map[string]string{
					"reconcileInterval": "5s",
				},
			},
			wantReconcile: 5 * time.Second,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := configTestScheme(t)
			builder := fake.NewClientBuilder().WithScheme(s)

			if tt.configMap != nil {
				builder = builder.WithObjects(tt.configMap)
			}

			cli := builder.Build()
			cfg := readOperatorConfig(context.Background(), cli, "test-ns")

			assert.Equal(t, tt.wantReconcile, cfg.ReconcileInterval)
		})
	}
}

func newConfigMap(name, namespace string, data, annotations map[string]string) *corev1.ConfigMap {
	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace, Annotations: annotations},
		Data:       data,
	}
}

func TestMapConfigMapToDashboard(t *testing.T) {
	r := &DashboardReconciler{Namespace: "test-ns"}
	for _, tt := range []struct {
		name string
		obj  *corev1.ConfigMap
		want bool
	}{
		{"distribution config enqueues", newConfigMap(distributionConfigMapName, "test-ns", nil, nil), true},
		{"operator config enqueues", newConfigMap(operatorConfigMapName, "test-ns", nil, nil), true},
		{"different namespace is ignored", newConfigMap(distributionConfigMapName, "other-ns", nil, nil), false},
		{"unrelated ConfigMap is ignored", newConfigMap("some-other-config", "test-ns", nil, nil), false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			reqs := r.mapConfigMapToDashboard(context.Background(), tt.obj)
			if !tt.want {
				assert.Empty(t, reqs)
				return
			}
			require.Len(t, reqs, 1)
			assert.Equal(t, v1alpha1.DashboardInstanceName, reqs[0].Name)
			assert.Empty(t, reqs[0].Namespace, "Dashboard is cluster-scoped")
		})
	}
}

func TestConfigMapUpdatePredicate(t *testing.T) {
	r := &DashboardReconciler{}
	p := r.configMapUpdatePredicate()
	watched := newConfigMap(distributionConfigMapName, "test-ns", nil, nil)

	t.Run("create delete and generic events are accepted after cache selection", func(t *testing.T) {
		assert.True(t, p.Create(event.TypedCreateEvent[*corev1.ConfigMap]{Object: watched}))
		assert.True(t, p.Delete(event.TypedDeleteEvent[*corev1.ConfigMap]{Object: watched}))
		assert.True(t, p.Generic(event.TypedGenericEvent[*corev1.ConfigMap]{Object: watched}))
	})

	churnOld := newConfigMap(distributionConfigMapName, "test-ns", map[string]string{"platformVersion": "2.20.0"}, nil)
	churnOld.ResourceVersion = "100"
	churnOld.Labels = map[string]string{"example.com/synced-at": "old"}
	churnNew := newConfigMap(distributionConfigMapName, "test-ns", map[string]string{"platformVersion": "2.20.0"}, nil)
	churnNew.ResourceVersion = "101"
	churnNew.Labels = map[string]string{"example.com/synced-at": "new"}

	for _, tt := range []struct {
		name string
		old  *corev1.ConfigMap
		new  *corev1.ConfigMap
		want bool
	}{
		{"data change fires", newConfigMap(distributionConfigMapName, "test-ns", map[string]string{"platformVersion": "2.20.0"}, nil), newConfigMap(distributionConfigMapName, "test-ns", map[string]string{"platformVersion": "2.21.0"}, nil), true},
		{"metadata churn does not fire", churnOld, churnNew, false},
		{"distribution annotation change fires", newConfigMap(distributionConfigMapName, "test-ns", map[string]string{"platformVersion": "2.20.0"}, nil), newConfigMap(distributionConfigMapName, "test-ns", map[string]string{"platformVersion": "2.20.0"}, map[string]string{annotations.PlatformVersion: "2.21.0"}), true},
		{"operator config annotation change does not fire", newConfigMap(operatorConfigMapName, "test-ns", map[string]string{"reconcileInterval": "30s"}, nil), newConfigMap(operatorConfigMapName, "test-ns", map[string]string{"reconcileInterval": "30s"}, map[string]string{annotations.PlatformVersion: "2.21.0"}), false},
		{"operator config data change fires", newConfigMap(operatorConfigMapName, "test-ns", map[string]string{"reconcileInterval": "30s"}, nil), newConfigMap(operatorConfigMapName, "test-ns", map[string]string{"reconcileInterval": "60s"}, nil), true},
		{"unrelated annotation churn does not fire", newConfigMap(distributionConfigMapName, "test-ns", map[string]string{"platformVersion": "2.20.0"}, map[string]string{"kubectl.kubernetes.io/last-applied-configuration": "{}"}), newConfigMap(distributionConfigMapName, "test-ns", map[string]string{"platformVersion": "2.20.0"}, map[string]string{"kubectl.kubernetes.io/last-applied-configuration": "{\"data\":{}}"}), false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, p.Update(event.TypedUpdateEvent[*corev1.ConfigMap]{ObjectOld: tt.old, ObjectNew: tt.new}))
		})
	}
}

func TestNamedConfigMapNames(t *testing.T) {
	t.Run("uses separate distribution and operator config names by default", func(t *testing.T) {
		assert.Equal(t, []string{distributionConfigMapName, operatorConfigMapName}, namedConfigMapNames())
	})

	t.Run("uses the configured distribution config name", func(t *testing.T) {
		t.Setenv("OPERATOR_CONFIGMAP_NAME", "custom-distribution-config")
		assert.Equal(t, []string{"custom-distribution-config", operatorConfigMapName}, namedConfigMapNames())
	})

	t.Run("deduplicates a shared distribution and operator config name", func(t *testing.T) {
		t.Setenv("OPERATOR_CONFIGMAP_NAME", operatorConfigMapName)
		assert.Equal(t, []string{operatorConfigMapName}, namedConfigMapNames())
	})
}

func TestConfigMapWatchHonorsCustomDistributionConfigMapName(t *testing.T) {
	const customName = "custom-distribution-config"
	t.Setenv("OPERATOR_CONFIGMAP_NAME", customName)
	r := &DashboardReconciler{Namespace: "test-ns"}
	p := r.configMapUpdatePredicate()
	custom := newConfigMap(customName, "test-ns", map[string]string{"platformVersion": "2.20.0"}, nil)

	reqs := r.mapConfigMapToDashboard(context.Background(), custom)
	require.Len(t, reqs, 1)
	assert.Equal(t, v1alpha1.DashboardInstanceName, reqs[0].Name)

	defaultConfig := newConfigMap(distributionConfigMapName, "test-ns", map[string]string{"platformVersion": "2.20.0"}, nil)
	assert.Empty(t, r.mapConfigMapToDashboard(context.Background(), defaultConfig))

	updated := newConfigMap(customName, "test-ns", map[string]string{"platformVersion": "2.21.0"}, nil)
	assert.True(t, p.Update(event.TypedUpdateEvent[*corev1.ConfigMap]{ObjectOld: custom, ObjectNew: updated}))
	annotationUpdated := newConfigMap(customName, "test-ns", map[string]string{"platformVersion": "2.20.0"}, map[string]string{annotations.PlatformVersion: "2.21.0"})
	assert.True(t, p.Update(event.TypedUpdateEvent[*corev1.ConfigMap]{ObjectOld: custom, ObjectNew: annotationUpdated}))
}
