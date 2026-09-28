package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/dynamic/fake"
)

func TestGetOperatorSubscriptionStatusHandler(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.repositories.OperatorSubscriptionStatus = repositories.NewOperatorSubscriptionStatusRepository(
			fake.NewSimpleDynamicClient(runtime.NewScheme(), &unstructured.Unstructured{Object: map[string]any{
				"apiVersion": "operators.coreos.com/v1alpha1",
				"kind":       "Subscription",
				"metadata": map[string]any{
					"name":      "rhods-operator",
					"namespace": "redhat-ods-operator",
				},
				"spec":   map[string]any{"channel": "stable"},
				"status": map[string]any{"lastUpdated": "2026-09-25T12:00:00Z"},
			}}),
		)
	})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, OperatorSubscriptionStatusPath, nil)
	app.GetOperatorSubscriptionStatusHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
	var status models.OperatorSubscriptionStatus
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &status))
	assert.Equal(t, "stable", status.Channel)
	assert.Equal(t, "2026-09-25T12:00:00Z", status.LastUpdated)
}
