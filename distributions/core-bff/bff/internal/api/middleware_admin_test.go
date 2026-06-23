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

func dummyHandler(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"ok":true}`))
}

func TestRequireAdmin_AdminUserPassesThrough(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	handler := app.requireAdmin(dummyHandler)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	handler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRequireAdmin_NonAdminUserGets401(t *testing.T) {
	app := newTestApp()
	userA := k8mocks.DefaultTestUsers[1]

	handler := app.requireAdmin(dummyHandler)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: userA.UserName,
		Groups: userA.Groups,
		Token:  k8s.NewBearerToken(userA.Token),
	})

	handler(rr, req, nil)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	errObj, ok := body["error"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "UNAUTHORIZED", errObj["code"])
}

func TestRequireAdmin_MissingIdentityGets401(t *testing.T) {
	app := newTestApp()

	handler := app.requireAdmin(dummyHandler)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)

	handler(rr, req, nil)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}
