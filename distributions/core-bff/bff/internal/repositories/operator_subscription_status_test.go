package repositories

import (
	"context"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic/fake"
)

func subscription(name, namespace, channel, lastUpdated, installedCSV string) *unstructured.Unstructured {
	return &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "operators.coreos.com/v1alpha1",
		"kind":       "Subscription",
		"metadata": map[string]any{
			"name":      name,
			"namespace": namespace,
		},
		"spec":   map[string]any{"channel": channel},
		"status": map[string]any{"installedCSV": installedCSV, "lastUpdated": lastUpdated},
	}}
}

func dataScienceCluster(releaseName string) *unstructured.Unstructured {
	return &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "datasciencecluster.opendatahub.io/v2",
		"kind":       "DataScienceCluster",
		"metadata":   map[string]any{"name": "default-dsc"},
		"status":     map[string]any{"release": map[string]any{"name": releaseName}},
	}}
}

func TestGetOperatorSubscriptionStatus(t *testing.T) {
	tests := []struct {
		name          string
		releaseName   string
		subscriptions []runtime.Object
		expected      string
		lastUpdated   string
		notFound      bool
	}{
		{
			name:          "returns RHOAI channel",
			releaseName:   selfManagedRHOAIReleaseName,
			subscriptions: []runtime.Object{subscription("rhods-operator", "redhat-ods-operator", "stable", "2026-09-25T12:00:00Z", "rhods-operator.v3.0.0")},
			expected:      "stable",
			lastUpdated:   "2026-09-25T12:00:00Z",
		},
		{
			name:          "returns ODH channel",
			releaseName:   "Open Data Hub",
			subscriptions: []runtime.Object{subscription("opendatahub-operator", "opendatahub-operator", "fast", "2026-09-25T13:00:00Z", "opendatahub-operator.v2.0.0")},
			expected:      "fast",
			lastUpdated:   "2026-09-25T13:00:00Z",
		},
		{
			name:        "returns not found when selected operator is not installed",
			releaseName: "Open Data Hub",
			notFound:    true,
		},
		{
			name:          "returns not found when selected operator CSV does not match",
			releaseName:   "Open Data Hub",
			subscriptions: []runtime.Object{subscription("opendatahub-operator", "opendatahub-operator", "fast", "2026-09-25T13:00:00Z", "another-operator.v1.0.0")},
			notFound:      true,
		},
		{
			name:          "returns not found when selected operator has no installed CSV",
			releaseName:   "Open Data Hub",
			subscriptions: []runtime.Object{subscription("opendatahub-operator", "opendatahub-operator", "fast", "2026-09-25T13:00:00Z", "")},
			notFound:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			objects := append([]runtime.Object{dataScienceCluster(tt.releaseName)}, tt.subscriptions...)
			dynClient := fake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), map[schema.GroupVersionResource]string{
				models.DataScienceClusterGVR: "DataScienceClusterList",
			}, objects...)
			repo := NewOperatorSubscriptionStatusRepository(dynClient)

			status, err := repo.GetOperatorSubscriptionStatus(context.Background())

			if tt.notFound {
				require.Error(t, err)
				assert.True(t, apierrors.IsNotFound(err))
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.expected, status.Channel)
			assert.Equal(t, tt.lastUpdated, status.LastUpdated)
		})
	}
}

func TestGetOperatorSubscriptionStatus_PrefersRHOAI(t *testing.T) {
	dynClient := fake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), map[schema.GroupVersionResource]string{
		models.DataScienceClusterGVR: "DataScienceClusterList",
	}, dataScienceCluster(selfManagedRHOAIReleaseName),
		subscription("rhods-operator", "redhat-ods-operator", "stable", "2026-09-25T12:00:00Z", "rhods-operator.v3.0.0"),
		subscription("opendatahub-operator", "opendatahub-operator", "fast", "2026-09-25T13:00:00Z", "opendatahub-operator.v2.0.0"),
	)
	repo := NewOperatorSubscriptionStatusRepository(dynClient)

	status, err := repo.GetOperatorSubscriptionStatus(context.Background())

	require.NoError(t, err)
	assert.Equal(t, "stable", status.Channel)
	assert.Equal(t, "2026-09-25T12:00:00Z", status.LastUpdated)
}
