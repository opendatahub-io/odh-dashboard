package controller

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func configTestScheme(t *testing.T) *runtime.Scheme {
	t.Helper()

	s := runtime.NewScheme()
	if err := clientgoscheme.AddToScheme(s); err != nil {
		t.Fatalf("failed to add client-go scheme: %v", err)
	}

	return s
}

func TestReadOperatorConfig(t *testing.T) {
	tests := []struct {
		name          string
		configMap     *corev1.ConfigMap
		wantLogLevel  string
		wantReconcile time.Duration
	}{
		{
			name:          "configmap does not exist",
			configMap:     nil,
			wantLogLevel:  "",
			wantReconcile: 0,
		},
		{
			name: "valid config",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: operatorConfigMapName, Namespace: "test-ns"},
				Data: map[string]string{
					"logLevel":          "debug",
					"reconcileInterval": "30s",
				},
			},
			wantLogLevel:  "debug",
			wantReconcile: 30 * time.Second,
		},
		{
			name: "invalid reconcile interval",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: operatorConfigMapName, Namespace: "test-ns"},
				Data: map[string]string{
					"logLevel":          "info",
					"reconcileInterval": "not-a-duration",
				},
			},
			wantLogLevel:  "info",
			wantReconcile: 0,
		},
		{
			name: "empty data",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: operatorConfigMapName, Namespace: "test-ns"},
				Data:       map[string]string{},
			},
			wantLogLevel:  "",
			wantReconcile: 0,
		},
		{
			name: "only logLevel set",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: operatorConfigMapName, Namespace: "test-ns"},
				Data: map[string]string{
					"logLevel": "error",
				},
			},
			wantLogLevel:  "error",
			wantReconcile: 0,
		},
		{
			name: "nil data map",
			configMap: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: operatorConfigMapName, Namespace: "test-ns"},
			},
			wantLogLevel:  "",
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
			wantLogLevel:  "",
			wantReconcile: 0,
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

			assert.Equal(t, tt.wantLogLevel, cfg.LogLevel)
			assert.Equal(t, tt.wantReconcile, cfg.ReconcileInterval)
		})
	}
}
