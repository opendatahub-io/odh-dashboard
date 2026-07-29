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

func TestGetNIMServingResource_InvalidResource(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "nim-invalid"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/nim-serving/invalidType", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{{Key: "nimResource", Value: "invalidType"}}
	app.GetNIMServingResourceHandler(rr, req, ps)

	assert.Equal(t, http.StatusNotFound, rr.Code)

	var body HTTPError
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)
	assert.Equal(t, "NOT_FOUND", body.Error.Code)
}

func TestGetNIMServingResource_NoAccount(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "nim-no-account"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/nim-serving/apiKeySecret", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{{Key: "nimResource", Value: "apiKeySecret"}}
	app.GetNIMServingResourceHandler(rr, req, ps)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestGetNIMServingResource_AllValidResourceTypes(t *testing.T) {
	validTypes := []string{"apiKeySecret", "nimPullSecret", "nimConfig"}

	for _, rt := range validTypes {
		t.Run(rt, func(t *testing.T) {
			app := newTestApp(func(a *App) {
				a.config.Namespace = "nim-valid-" + rt
			})
			admin := k8mocks.DefaultTestUsers[0]

			rr := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, "/api/nim-serving/"+rt, nil)
			req = reqWithIdentity(req, &k8s.RequestIdentity{
				UserID: admin.UserName,
				Groups: admin.Groups,
				Token:  k8s.NewBearerToken(admin.Token),
			})

			ps := httprouter.Params{{Key: "nimResource", Value: rt}}
			app.GetNIMServingResourceHandler(rr, req, ps)

			// No NIM Account instance exists in the namespace, so GetNIMServingResource
			// returns NIMNotFoundError. The resource type itself is valid (no panic, no 400).
			assert.Equal(t, http.StatusNotFound, rr.Code)
		})
	}
}
