package repositories

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/dynamic/fake"
)

func subscription(name, namespace, channel, lastUpdated string) *unstructured.Unstructured {
	return &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "operators.coreos.com/v1alpha1",
		"kind":       "Subscription",
		"metadata": map[string]any{
			"name":      name,
			"namespace": namespace,
		},
		"spec":   map[string]any{"channel": channel},
		"status": map[string]any{"lastUpdated": lastUpdated},
	}}
}

func TestGetOperatorSubscriptionStatus(t *testing.T) {
	tests := []struct {
		name          string
		subscriptions []runtime.Object
		expected      string
		lastUpdated   string
	}{
		{
			name:          "returns RHOAI channel",
			subscriptions: []runtime.Object{subscription("rhods-operator", "redhat-ods-operator", "stable", "2026-09-25T12:00:00Z")},
			expected:      "stable",
			lastUpdated:   "2026-09-25T12:00:00Z",
		},
		{
			name:          "returns ODH channel",
			subscriptions: []runtime.Object{subscription("opendatahub-operator", "opendatahub-operator", "fast", "2026-09-25T13:00:00Z")},
			expected:      "fast",
			lastUpdated:   "2026-09-25T13:00:00Z",
		},
		{
			name:     "returns unknown when no supported operator is installed",
			expected: unknownOperatorChannel,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := NewOperatorSubscriptionStatusRepository(fake.NewSimpleDynamicClient(runtime.NewScheme(), tt.subscriptions...))

			status, err := repo.GetOperatorSubscriptionStatus(context.Background())

			require.NoError(t, err)
			assert.Equal(t, tt.expected, status.Channel)
			assert.Equal(t, tt.lastUpdated, status.LastUpdated)
		})
	}
}

func TestGetOperatorSubscriptionStatus_PrefersRHOAI(t *testing.T) {
	repo := NewOperatorSubscriptionStatusRepository(fake.NewSimpleDynamicClient(runtime.NewScheme(),
		subscription("rhods-operator", "redhat-ods-operator", "stable", "2026-09-25T12:00:00Z"),
		subscription("opendatahub-operator", "opendatahub-operator", "fast", "2026-09-25T13:00:00Z"),
	))

	status, err := repo.GetOperatorSubscriptionStatus(context.Background())

	require.NoError(t, err)
	assert.Equal(t, "stable", status.Channel)
	assert.Equal(t, "2026-09-25T12:00:00Z", status.LastUpdated)
}
