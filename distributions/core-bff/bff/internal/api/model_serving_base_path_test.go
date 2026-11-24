package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// MODEL_SERVING_HOST accepts a base URL with a path; an upstream mounted under
// that prefix must receive /prefix/<route>, not /<route>.
func TestModelServingProxy_KeepsTheConfiguredBasePath(t *testing.T) {
	got := make(chan string, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got <- r.URL.Path + "?" + r.URL.RawQuery
	}))
	defer upstream.Close()

	app := newTestApp(func(a *App) {
		a.config = config.EnvConfig{
			DevMode:                 true,
			AuthMethod:              config.AuthMethodUser,
			AuthTokenHeader:         config.DefaultAuthTokenHeader,
			ModelServingServiceHost: upstream.URL + "/serving",
		}
	})
	require.NoError(t, app.initModelServingProxy())

	req := reqWithIdentity(httptest.NewRequest(http.MethodGet, modelServingPathPrefix+"/v1/models?limit=2", nil),
		&k8s.RequestIdentity{Token: k8s.NewBearerToken("caller-token")})
	app.modelServingProxy.ServeHTTP(httptest.NewRecorder(), req)

	assert.Equal(t, "/serving/v1/models?limit=2", <-got)
}
