package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateClusterSettings_ValidInput(t *testing.T) {
	s := &models.ClusterSettings{
		PVCSize:                   20,
		CullerTimeout:             31536000,
		DefaultDeploymentStrategy: "rolling",
	}
	assert.NoError(t, validateClusterSettings(s))
}

func TestValidateClusterSettings_EmptyStrategy(t *testing.T) {
	s := &models.ClusterSettings{
		PVCSize:       20,
		CullerTimeout: 0,
	}
	assert.NoError(t, validateClusterSettings(s))
}

func TestValidateClusterSettings_NegativePVC(t *testing.T) {
	s := &models.ClusterSettings{PVCSize: -1, CullerTimeout: 0}
	err := validateClusterSettings(s)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "pvcSize")
}

func TestValidateClusterSettings_ZeroPVC(t *testing.T) {
	s := &models.ClusterSettings{PVCSize: 0, CullerTimeout: 0}
	err := validateClusterSettings(s)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "pvcSize")
}

func TestValidateClusterSettings_NegativeTimeout(t *testing.T) {
	s := &models.ClusterSettings{PVCSize: 20, CullerTimeout: -1}
	err := validateClusterSettings(s)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cullerTimeout")
}

func TestValidateClusterSettings_NonMultipleOf60Timeout(t *testing.T) {
	s := &models.ClusterSettings{PVCSize: 20, CullerTimeout: 90}
	err := validateClusterSettings(s)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "multiple of 60")
}

func TestValidateClusterSettings_InvalidStrategy(t *testing.T) {
	s := &models.ClusterSettings{
		PVCSize:                   20,
		CullerTimeout:             0,
		DefaultDeploymentStrategy: "bluegreen",
	}
	err := validateClusterSettings(s)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "defaultDeploymentStrategy")
}

func TestValidateClusterSettings_RecreateStrategy(t *testing.T) {
	s := &models.ClusterSettings{
		PVCSize:                   20,
		CullerTimeout:             0,
		DefaultDeploymentStrategy: "recreate",
	}
	assert.NoError(t, validateClusterSettings(s))
}

func TestGetClusterSettingsHandler_Success(t *testing.T) {
	fakeDyn := newFakeDynWithDashboardCR()
	app := newTestApp(func(a *App) {
		a.config.Namespace = "dash-ns"
		a.config.DashboardConfigName = "odh-dashboard-config"
		a.repositories = repositories.NewRepositories(false, fakeDyn, testSAClientset, "")
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/cluster-settings", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.GetClusterSettingsHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var settings models.ClusterSettings
	err := json.Unmarshal(rr.Body.Bytes(), &settings)
	require.NoError(t, err)
	assert.Greater(t, settings.PVCSize, 0)
}

func TestUpdateClusterSettingsHandler_ValidInput_Returns200(t *testing.T) {
	ns := "cs-update-valid"
	createTestNamespace(t, ns)
	fakeDyn := newFakeDynWithDashboardCR()
	app := newTestApp(func(a *App) {
		a.config.Namespace = ns
		a.config.DashboardConfigName = "odh-dashboard-config"
		a.repositories = repositories.NewRepositories(false, fakeDyn, testSAClientset, "")
	})
	admin := k8mocks.DefaultTestUsers[0]

	body, _ := json.Marshal(models.ClusterSettings{
		PVCSize:                   20,
		CullerTimeout:             31536000,
		DefaultDeploymentStrategy: "rolling",
	})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/cluster-settings", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.UpdateClusterSettingsHandler(rr, req, nil)

	// Always returns 200 with MutationResponse.
	assert.Equal(t, http.StatusOK, rr.Code)

	var result models.MutationResponse
	err := json.Unmarshal(rr.Body.Bytes(), &result)
	require.NoError(t, err)
	assert.True(t, result.Success)
	assert.Empty(t, result.Error)
}

func TestUpdateClusterSettingsHandler_MalformedBody_Returns400(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "dash-ns"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, ClusterSettingsPath, bytes.NewReader([]byte("not-json")))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.UpdateClusterSettingsHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestUpdateClusterSettingsHandler_InvalidInput_Returns400(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "dash-ns"
	})
	admin := k8mocks.DefaultTestUsers[0]

	body, _ := json.Marshal(models.ClusterSettings{
		PVCSize:       -1,
		CullerTimeout: 0,
	})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/cluster-settings", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.UpdateClusterSettingsHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}
