package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetNIMIntegrationStatus_NoCRD(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "nim-status-nocrd"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, NIMIntegrationPath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.GetNIMIntegrationStatusHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var status models.NIMIntegrationStatus
	err := json.Unmarshal(rr.Body.Bytes(), &status)
	require.NoError(t, err)
	assert.Equal(t, "Unknown", status.VariablesValidationStatus)
}

func TestCreateNIMIntegration_InvalidBody(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "nim-create-bad"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, NIMIntegrationPath, strings.NewReader(`{invalid`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.CreateNIMIntegrationHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateNIMIntegration_EmptyBody(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "nim-create-empty"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, NIMIntegrationPath, strings.NewReader(""))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.CreateNIMIntegrationHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateNIMIntegration_EmptySecretData(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "nim-create-empty-data"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, NIMIntegrationPath, strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.CreateNIMIntegrationHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "secret data must not be empty")
}

func TestDeleteNIMIntegration_NoAccount(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "nim-delete-noaccount"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodDelete, NIMIntegrationPath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.DeleteNIMIntegrationHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp models.NIMDeleteResponse
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.False(t, resp.Success)
	assert.Equal(t, "Unable to delete NIM account: the resource was not found", resp.Error)
}
