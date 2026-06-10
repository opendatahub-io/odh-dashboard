package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetStatusHandler_AdminUser(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.clusterInfo = clusterInfo{
			clusterID:       "test-cluster-id",
			clusterBranding: "ocp",
			serverURL:       "https://api.test.example.com:6443",
			currentContext:  "test-context",
		}
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, StatusPath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.GetStatusHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	kube, ok := body["kube"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, true, kube["isAdmin"])
	assert.Equal(t, true, kube["isAllowed"])
	assert.Equal(t, "test-cluster-id", kube["clusterID"])
	assert.Equal(t, "ocp", kube["clusterBranding"])
	assert.Equal(t, "https://api.test.example.com:6443", kube["serverURL"])
	assert.NotEmpty(t, kube["userName"])
	assert.NotEmpty(t, kube["currentContext"])
	currentUser, ok := kube["currentUser"].(map[string]any)
	require.True(t, ok)
	assert.NotEmpty(t, currentUser["name"])
}

func TestGetStatusHandler_NonAdminUser(t *testing.T) {
	app := newTestApp()
	userA := k8mocks.DefaultTestUsers[1]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, StatusPath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: userA.UserName,
		Groups: userA.Groups,
		Token:  k8s.NewBearerToken(userA.Token),
	})

	app.GetStatusHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	kube, ok := body["kube"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, false, kube["isAdmin"])
	// Auth CRD is absent in envtest. The SA client gets a clean "not found" (not 403),
	// so GetAuth returns nil = CRD absent = all users allowed.
	assert.Equal(t, true, kube["isAllowed"])
}

func TestGetAllowedUsersHandler_ReturnsEmptyArray(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "opendatahub"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/status/opendatahub/allowedUsers", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{{Key: "namespace", Value: "opendatahub"}}
	app.GetAllowedUsersHandler(rr, req, ps)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body []any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)
	assert.Empty(t, body)
}

func TestGetAllowedUsersHandler_WrongNamespace_Returns403(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "opendatahub"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/status/wrong-ns/allowedUsers", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{{Key: "namespace", Value: "wrong-ns"}}
	app.GetAllowedUsersHandler(rr, req, ps)

	assert.Equal(t, http.StatusForbidden, rr.Code)
}

func TestGetStatusHandler_MissingIdentity(t *testing.T) {
	app := newTestApp()

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, StatusPath, nil)

	app.GetStatusHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}
