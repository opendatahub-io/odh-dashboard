package api

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPrometheusQuery_EmptyQuery(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, PrometheusQueryPath, strings.NewReader(`{"query":""}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.PrometheusQueryHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)

	var resp models.PrometheusQueryResponse
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.Code)
}

func TestPrometheusQuery_WhitespaceOnlyQuery(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, PrometheusQueryPath, strings.NewReader(`{"query":"   "}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.PrometheusQueryHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestPrometheusQuery_NoIdentity(t *testing.T) {
	mockSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"success"}`))
	}))
	defer mockSrv.Close()

	app := newTestApp(func(a *App) {
		a.repositories.Prometheus = repositories.NewPrometheusRepository(repositories.PrometheusConfig{
			Host: mockSrv.URL,
		})
	})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, PrometheusQueryPath, strings.NewReader(`{"query":"up"}`))
	req.Header.Set("Content-Type", "application/json")

	app.PrometheusQueryHandler(rr, req, nil)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestPrometheusQuery_NoHost(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.repositories.Prometheus = repositories.NewPrometheusRepository(repositories.PrometheusConfig{})
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, PrometheusQueryPath, strings.NewReader(`{"query":"up"}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.PrometheusQueryHandler(rr, req, nil)

	assert.Equal(t, http.StatusServiceUnavailable, rr.Code)

	var resp models.PrometheusQueryResponse
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, http.StatusServiceUnavailable, resp.Code)
}

func TestPrometheusQuery_Success(t *testing.T) {
	promResponse := `{"status":"success","data":{"resultType":"vector","result":[]}}`
	mockSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		assert.Contains(t, r.URL.Path, "/api/v1/query")
		assert.Contains(t, r.Header.Get("Authorization"), "Bearer ")
		assert.Equal(t, "up", r.URL.Query().Get("query"))
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(promResponse))
	}))
	defer mockSrv.Close()

	app := newTestApp(func(a *App) {
		a.repositories.Prometheus = repositories.NewPrometheusRepository(repositories.PrometheusConfig{
			Host: mockSrv.URL,
		})
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, PrometheusQueryPath, strings.NewReader(`{"query":"query=up"}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.PrometheusQueryHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp models.PrometheusQueryResponse
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.Code)
}

func TestPrometheusQuery_UpstreamError(t *testing.T) {
	mockSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte(`bad gateway`))
	}))
	defer mockSrv.Close()

	app := newTestApp(func(a *App) {
		a.repositories.Prometheus = repositories.NewPrometheusRepository(repositories.PrometheusConfig{
			Host: mockSrv.URL,
		})
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, PrometheusQueryPath, strings.NewReader(`{"query":"query=up"}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.PrometheusQueryHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadGateway, rr.Code)
}

func TestPrometheusQuery_UnparsableResponse(t *testing.T) {
	mockSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		_, _ = w.Write([]byte(`this is not json`))
	}))
	defer mockSrv.Close()

	app := newTestApp(func(a *App) {
		a.repositories.Prometheus = repositories.NewPrometheusRepository(repositories.PrometheusConfig{
			Host: mockSrv.URL,
		})
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, PrometheusQueryPath, strings.NewReader(`{"query":"query=up"}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.PrometheusQueryHandler(rr, req, nil)

	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)

	var resp models.PrometheusQueryResponse
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
}

func TestPrometheusQuery_InvalidJSON(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, PrometheusQueryPath, strings.NewReader(`{invalid`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.PrometheusQueryHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestPrometheusQuery_QueryRangePath(t *testing.T) {
	mockSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Contains(t, r.URL.Path, "/api/v1/query_range")
		assert.Equal(t, "rate(up[5m])", r.URL.Query().Get("query"))
		assert.Equal(t, "1234", r.URL.Query().Get("start"))
		assert.Equal(t, "5678", r.URL.Query().Get("end"))
		assert.Equal(t, "30", r.URL.Query().Get("step"))
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"success","data":{}}`))
	}))
	defer mockSrv.Close()

	app := newTestApp(func(a *App) {
		a.repositories.Prometheus = repositories.NewPrometheusRepository(repositories.PrometheusConfig{
			Host: mockSrv.URL,
		})
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, PrometheusQueryRangePath, strings.NewReader(`{"query":"query=rate(up[5m])&start=1234&end=5678&step=30"}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.PrometheusQueryHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestPrometheusQuery_QueryError(t *testing.T) {
	mockSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"error","error":"parse error: unexpected end of input"}`))
	}))
	defer mockSrv.Close()

	app := newTestApp(func(a *App) {
		a.repositories.Prometheus = repositories.NewPrometheusRepository(repositories.PrometheusConfig{
			Host: mockSrv.URL,
		})
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, PrometheusQueryPath, strings.NewReader(`{"query":"query=invalid("}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.PrometheusQueryHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)

	var resp models.PrometheusQueryResponse
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.Code)
	assert.Contains(t, string(resp.Response), "parse error")
}

func TestResolvePrometheusQueryType(t *testing.T) {
	tests := []struct {
		path string
		want string
	}{
		{"/api/prometheus/query", "query"},
		{"/api/prometheus/queryRange", "query_range"},
		{"/api/prometheus/pvc", "query"},
		{"/api/prometheus/bias", "query_range"},
		{"/api/prometheus/serving", "query_range"},
		{"/some/other/path", "query"},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			assert.Equal(t, tt.want, resolvePrometheusQueryType(tt.path))
		})
	}
}

func TestPrometheusUnexpectedFailureKeepsEnvelopeWithoutRawError(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))
	app := newTestApp(func(a *App) {
		a.logger = logger
		a.repositories.Prometheus = repositories.NewPrometheusRepository(repositories.PrometheusConfig{Host: "http://CANARY_SECRET/%zz"})
	})
	request := httptest.NewRequest(http.MethodPost, PrometheusQueryPath, strings.NewReader(`{"query":"query=up"}`))
	request.Header.Set("Content-Type", "application/json")
	request = reqWithIdentity(request, &k8s.RequestIdentity{Token: k8s.NewBearerToken("CANARY_TOKEN")})
	response := httptest.NewRecorder()
	app.PrometheusQueryHandler(response, request, nil)
	require.Equal(t, http.StatusInternalServerError, response.Code)
	var body models.PrometheusQueryResponse
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &body))
	require.Equal(t, http.StatusInternalServerError, body.Code)
	require.JSONEq(t, `"Cannot fetch prometheus data"`, string(body.Response))
	require.NotContains(t, response.Body.String()+logs.String(), "CANARY")
}

func TestPrometheusRoutesForwardRequestCorrelation(t *testing.T) {
	for _, prefix := range []string{"", PathPrefix} {
		for _, path := range []string{PrometheusQueryPath, PrometheusQueryRangePath} {
			for _, status := range []int{http.StatusOK, http.StatusServiceUnavailable} {
				t.Run(prefix+path+"/"+http.StatusText(status), func(t *testing.T) {
					upstreamHeaders := make(chan http.Header, 1)
					upstreamBody := `{"status":"success","data":{}}`
					if status != http.StatusOK {
						upstreamBody = `{"status":"error","error":"upstream unavailable"}`
					}
					const auditID = "2895b0a0-7694-47d0-8cb4-869b93fe68be"
					upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
						upstreamHeaders <- r.Header.Clone()
						w.Header().Set(constants.HeaderContentType, constants.ContentTypeJSON)
						w.Header().Set(httpcontract.AuditIDHeader, auditID)
						w.WriteHeader(status)
						_, _ = w.Write([]byte(upstreamBody))
					}))
					defer upstream.Close()
					app := newTestApp(func(a *App) {
						a.config.AuthMethod = config.AuthMethodUser
						a.config.PlatformType = config.PlatformOpenShift
						a.repositories.Prometheus = repositories.NewPrometheusRepository(repositories.PrometheusConfig{Host: upstream.URL})
					})
					admin := k8mocks.DefaultTestUsers[0]
					request := httptest.NewRequest(http.MethodPost, prefix+path, strings.NewReader(`{"query":"query=up"}`))
					request.Header.Set(app.config.AuthTokenHeader, admin.Token)
					request.Header.Set(constants.HeaderContentType, constants.ContentTypeJSON)
					request.Header.Set(httpcontract.RequestIDHeader, "untrusted-caller-id")
					response := httptest.NewRecorder()
					app.Routes().ServeHTTP(response, request)
					require.Equal(t, status, response.Code)
					id := response.Header().Get(httpcontract.RequestIDHeader)
					require.NotEmpty(t, id)
					require.NotEqual(t, "untrusted-caller-id", id)
					require.Len(t, upstreamHeaders, 1, "the request must reach Prometheus")
					headers := <-upstreamHeaders
					require.Equal(t, id, headers.Get(httpcontract.RequestIDHeader))
					require.Equal(t, auditID, response.Header().Get(httpcontract.AuditIDHeader))
					require.NotEqual(t, auditID, id)
					require.Equal(t, k8s.BearerTokenPrefix+admin.Token, headers.Get(constants.HeaderAuthorization))
					var body models.PrometheusQueryResponse
					require.NoError(t, json.Unmarshal(response.Body.Bytes(), &body))
					require.Equal(t, status, body.Code)
					if status == http.StatusOK {
						require.JSONEq(t, upstreamBody, string(body.Response))
					} else {
						var message string
						require.NoError(t, json.Unmarshal(body.Response, &message))
						require.Equal(t, "Cannot fetch prometheus data, "+upstreamBody, message)
					}
				})
			}
		}
	}
}
