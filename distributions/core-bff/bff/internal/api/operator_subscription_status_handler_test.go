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
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/dynamic/fake"
)

func TestGetOperatorSubscriptionStatusHandler(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.repositories.OperatorSubscriptionStatus = repositories.NewOperatorSubscriptionStatusRepository(
			fake.NewSimpleDynamicClient(runtime.NewScheme()),
		)
	})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, OperatorSubscriptionStatusPath, nil)
	app.GetOperatorSubscriptionStatusHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
	var status models.OperatorSubscriptionStatus
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &status))
	assert.Equal(t, "Unknown", status.Channel)
}
