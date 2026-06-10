package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNamespacesHandler_ReturnsNamespaces(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, NamespacePath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.GetNamespacesHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	data, ok := body["data"].([]any)
	require.True(t, ok)
	assert.NotEmpty(t, data, "admin user should see at least one namespace")
}

func TestNamespacesHandler_NonAdminUserForbidden(t *testing.T) {
	app := newTestApp()
	userA := k8mocks.DefaultTestUsers[1]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, NamespacePath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: userA.UserName,
		Groups: userA.Groups,
		Token:  k8s.NewBearerToken(userA.Token),
	})

	app.GetNamespacesHandler(rr, req, nil)

	assert.Equal(t, http.StatusInternalServerError, rr.Code,
		"non-admin without cluster-wide list permission should get 500")
}

func TestNamespacesHandler_MissingIdentity(t *testing.T) {
	app := newTestApp()

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, NamespacePath, nil)

	app.GetNamespacesHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	errObj, ok := body["error"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "BAD_REQUEST", errObj["code"])
}
