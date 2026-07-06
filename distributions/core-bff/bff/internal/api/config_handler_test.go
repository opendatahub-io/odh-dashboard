package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetConfigHandler_ReturnsDefaults(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "opendatahub"
		a.config.DashboardConfigName = "odh-dashboard-config"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, ConfigPath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.GetConfigHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	spec := body["spec"].(map[string]any)
	dc := spec["dashboardConfig"].(map[string]any)
	assert.Equal(t, true, dc["enablement"])
	assert.Equal(t, false, dc["disableProjects"])
}

func TestGetConfigHandler_InvalidToken_Returns401(t *testing.T) {
	app := newTestApp()

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, ConfigPath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: "attacker",
		Token:  k8s.NewBearerToken("garbage-token-abc123"),
	})

	app.GetConfigHandler(rr, req, nil)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestGetConfigHandler_XKSPlatform_DisablesProjects(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "opendatahub"
		a.config.DashboardConfigName = "odh-dashboard-config"
		a.repositories = repositories.NewRepositories(true, testSADynClient, testSAClientset, "")
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, ConfigPath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.GetConfigHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	spec := body["spec"].(map[string]any)
	dc := spec["dashboardConfig"].(map[string]any)
	assert.Equal(t, true, dc["disableProjects"])
	assert.Equal(t, true, dc["disableBYONImageStream"])
	assert.Equal(t, true, dc["disableISVBadges"])
	assert.Equal(t, true, dc["disableAppLauncher"])
}

func TestPatchConfigHandler_Success(t *testing.T) {
	fakeDyn := newFakeDynWithDashboardCR()
	app := newTestApp(func(a *App) {
		a.config.Namespace = "dash-ns"
		a.config.DashboardConfigName = "odh-dashboard-config"
		a.repositories = repositories.NewRepositories(false, fakeDyn, testSAClientset, "")
	})
	admin := k8mocks.DefaultTestUsers[0]

	patch := `{"spec":{"dashboardConfig":{"disableKServe":true}}}`

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, ConfigPath, bytes.NewReader([]byte(patch)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.PatchConfigHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	spec := body["spec"].(map[string]any)
	dc := spec["dashboardConfig"].(map[string]any)
	assert.Equal(t, true, dc["disableKServe"])
	assert.Equal(t, true, dc["enablement"])
}

func TestGetConfigHandler_FeatureFlagOverrides(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "opendatahub"
		a.config.DashboardConfigName = "odh-dashboard-config"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, ConfigPath, nil)
	req.Header.Set("x-odh-feature-flags", `{"disableKServe":true,"disableModelServing":true}`)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.GetConfigHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	spec := body["spec"].(map[string]any)
	dc := spec["dashboardConfig"].(map[string]any)

	// Header overrides applied
	assert.Equal(t, true, dc["disableKServe"])
	assert.Equal(t, true, dc["disableModelServing"])

	// Lockouts still enforced after header overrides
	assert.Equal(t, true, dc["disableFineTuning"])
}

func TestPatchConfigHandler_CRDAbsent_Returns404(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "opendatahub"
		a.config.DashboardConfigName = "odh-dashboard-config"
	})
	admin := k8mocks.DefaultTestUsers[0]

	patch := `{"spec":{"dashboardConfig":{"disableKServe":true}}}`

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, ConfigPath, bytes.NewReader([]byte(patch)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.PatchConfigHandler(rr, req, nil)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestGetConfigHandler_MalformedFeatureFlagHeader_Ignored(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "opendatahub"
		a.config.DashboardConfigName = "odh-dashboard-config"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, ConfigPath, nil)
	req.Header.Set("x-odh-feature-flags", "not-valid-json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.GetConfigHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
}
