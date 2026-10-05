package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic/fake"
	k8stesting "k8s.io/client-go/testing"
)

func TestGetOperatorSubscriptionStatusHandler(t *testing.T) {
	dsc := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "datasciencecluster.opendatahub.io/v2",
		"kind":       "DataScienceCluster",
		"metadata":   map[string]any{"name": "default-dsc"},
		"status": map[string]any{
			"release": map[string]any{"name": "OpenShift AI Self-Managed"},
		},
	}}
	subscription := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "operators.coreos.com/v1alpha1",
		"kind":       "Subscription",
		"metadata": map[string]any{
			"name":      "rhods-operator",
			"namespace": "redhat-ods-operator",
		},
		"spec": map[string]any{"channel": "stable"},
		"status": map[string]any{
			"installedCSV": "rhods-operator.v3.0.0",
			"lastUpdated":  "2026-09-25T12:00:00Z",
		},
	}}
	app := newTestApp(func(a *App) {
		a.repositories.OperatorSubscriptionStatus = repositories.NewOperatorSubscriptionStatusRepository(
			fake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), map[schema.GroupVersionResource]string{
				models.DataScienceClusterGVR: "DataScienceClusterList",
			}, dsc, subscription), "",
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

func TestGetOperatorSubscriptionStatusHandlerFailures(t *testing.T) {
	for _, tt := range []struct {
		name       string
		err        error
		wantStatus int
	}{
		{name: "missing subscription", err: apierrors.NewNotFound(models.SubscriptionGVR.GroupResource(), "rhods-operator"), wantStatus: http.StatusNotFound},
		{name: "service account forbidden", err: apierrors.NewForbidden(models.SubscriptionGVR.GroupResource(), "rhods-operator", errors.New("forbidden")), wantStatus: http.StatusInternalServerError},
		{name: "upstream unavailable", err: errors.New("Kubernetes unavailable"), wantStatus: http.StatusInternalServerError},
	} {
		t.Run(tt.name, func(t *testing.T) {
			dynClient := fake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), map[schema.GroupVersionResource]string{
				models.DataScienceClusterGVR: "DataScienceClusterList",
			})
			dynClient.PrependReactor("get", "subscriptions", func(k8stesting.Action) (bool, runtime.Object, error) {
				return true, nil, tt.err
			})
			app := newTestApp(func(a *App) {
				a.repositories.OperatorSubscriptionStatus = repositories.NewOperatorSubscriptionStatusRepository(dynClient, "")
			})
			rr := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, OperatorSubscriptionStatusPath, nil)
			app.GetOperatorSubscriptionStatusHandler(rr, req, nil)
			assert.Equal(t, tt.wantStatus, rr.Code)
			assert.True(t, json.Valid(rr.Body.Bytes()), "error response must be JSON")
		})
	}
}
