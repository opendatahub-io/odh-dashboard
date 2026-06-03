package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserHandler_AdminUser(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, UserPath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.UserHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	data, ok := body["data"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, admin.UserName, data["userId"])
	assert.Equal(t, true, data["clusterAdmin"])
}

func TestUserHandler_NonAdminUser(t *testing.T) {
	app := newTestApp()
	userA := k8mocks.DefaultTestUsers[1]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, UserPath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: userA.UserName,
		Groups: userA.Groups,
		Token:  k8s.NewBearerToken(userA.Token),
	})

	app.UserHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	data, ok := body["data"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, userA.UserName, data["userId"])
	assert.Equal(t, false, data["clusterAdmin"])
}

func TestUserHandler_MissingIdentity(t *testing.T) {
	app := newTestApp()

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, UserPath, nil)

	app.UserHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	errObj, ok := body["error"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "BAD_REQUEST", errObj["code"])
}

func TestUserHandler_DisabledAuthUsesDefaultToken(t *testing.T) {
	app := newTestApp()

	identity := &k8s.RequestIdentity{
		Token: k8s.NewBearerToken(config.DefaultDisabledAuthToken),
	}

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, UserPath, nil)
	req = reqWithIdentity(req, identity)

	app.UserHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	data, ok := body["data"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, true, data["clusterAdmin"])
}
