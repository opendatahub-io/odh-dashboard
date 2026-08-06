package controller

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/annotations"
)

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
