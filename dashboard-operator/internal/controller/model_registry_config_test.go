package controller

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestModelRegistryUploadConfigReadFailurePreservesExistingConfig(t *testing.T) {
	ctx := context.Background()
	live := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: modelRegistryConfigMapName, Namespace: "applications"},
		Data: map[string]string{
			ociBaseImageParam:          "mirror.example.com/base:1",
			"images-jobs-async-upload": "registry.example.com/upload:1",
		},
	}
	cli := fake.NewClientBuilder().WithScheme(configTestScheme(t)).WithObjects(live).Build()
	r := &DashboardReconciler{
		Client: cli,
		APIReader: interceptor.NewClient(cli, interceptor.Funcs{
			Get: func(context.Context, client.WithWatch, client.ObjectKey, client.Object, ...client.GetOption) error {
				return assert.AnError
			},
		}),
	}
	dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{ModelRegistryOCIBaseImage: "mirror.example.com/Busybox:1"}}
	desired := unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "v1",
		"kind":       "ConfigMap",
		"metadata":   map[string]any{"name": live.Name, "namespace": live.Namespace},
		"data":       map[string]any{"images-jobs-async-upload": "registry.example.com/upload:2"},
	}}

	cm := conditions.NewManager(dashboard, string(common.ConditionTypeReady), string(common.ConditionTypeProvisioningSucceeded))
	err := r.reconcileModelRegistryUploadConfig(ctx, dashboard, []unstructured.Unstructured{desired}, cm)
	require.ErrorIs(t, err, assert.AnError)
	condition := cm.GetCondition(conditionModelRegistryConfigValid)
	require.NotNil(t, condition)
	assert.Contains(t, condition.Message, "spec.modelRegistryOCIBaseImage")
	assert.Equal(t, common.ConditionSeverityInfo, condition.Severity)
	retained := &corev1.ConfigMap{}
	require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(live), retained))
	assert.Equal(t, live.Data, retained.Data)
}
