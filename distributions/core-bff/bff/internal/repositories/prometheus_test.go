package repositories

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPrometheusQuery_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		assert.Contains(t, r.URL.Path, "/api/v1/query")
		assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))
		assert.Equal(t, "up", r.URL.Query().Get("query"))
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"success","data":{"resultType":"vector","result":[]}}`))
	}))
	defer srv.Close()

	repo := NewPrometheusRepository(PrometheusConfig{Host: srv.URL})
	resp, err := repo.Query(context.Background(), "test-token", "query=up", "query")

	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.Equal(t, http.StatusOK, resp.Code)
	assert.Contains(t, string(resp.Response), "success")
}

func TestPrometheusQuery_RangeQuery(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Contains(t, r.URL.Path, "/api/v1/query_range")
		assert.Equal(t, "rate(up[5m])", r.URL.Query().Get("query"))
		assert.Equal(t, "1234", r.URL.Query().Get("start"))
		assert.Equal(t, "5678", r.URL.Query().Get("end"))
		assert.Equal(t, "30", r.URL.Query().Get("step"))
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"success","data":{}}`))
	}))
	defer srv.Close()

	repo := NewPrometheusRepository(PrometheusConfig{Host: srv.URL})
	resp, err := repo.Query(context.Background(), "test-token", "query=rate(up[5m])&start=1234&end=5678&step=30", "query_range")

	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.Equal(t, http.StatusOK, resp.Code)
}

func TestPrometheusQuery_SpecialCharsEncoded(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, `sum(kube_pod_owner{owner_kind=~"RayCluster|Job", namespace="test"})`, r.URL.Query().Get("query"))
		assert.Equal(t, "test", r.URL.Query().Get("namespace"))
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"success","data":{}}`))
	}))
	defer srv.Close()

	repo := NewPrometheusRepository(PrometheusConfig{Host: srv.URL})
	resp, err := repo.Query(context.Background(), "test-token",
		`namespace=test&query=sum(kube_pod_owner{owner_kind=~"RayCluster|Job", namespace="test"})`, "query")

	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.Equal(t, http.StatusOK, resp.Code)
}

func TestPrometheusQuery_NoHost(t *testing.T) {
	repo := NewPrometheusRepository(PrometheusConfig{})
	resp, err := repo.Query(context.Background(), "test-token", "up", "query")

	assert.Nil(t, resp)
	require.Error(t, err)
	var unavailable *models.PrometheusUnavailableError
	assert.ErrorAs(t, err, &unavailable)
}

func TestPrometheusQuery_HostFromComponents(t *testing.T) {
	repo := NewPrometheusRepository(PrometheusConfig{
		Namespace: "openshift-monitoring",
		Instance:  "thanos-querier",
		Port:      "9092",
	})
	assert.Equal(t, "https://thanos-querier.openshift-monitoring.svc.cluster.local:9092", repo.host)
}

func TestPrometheusQuery_UpstreamNon2xx(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`Forbidden`))
	}))
	defer srv.Close()

	repo := NewPrometheusRepository(PrometheusConfig{Host: srv.URL})
	resp, err := repo.Query(context.Background(), "test-token", "query=up", "query")

	assert.Nil(t, resp)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "status 403")
}

func TestPrometheusQuery_UnparsableJSON(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		_, _ = w.Write([]byte(`not json at all`))
	}))
	defer srv.Close()

	repo := NewPrometheusRepository(PrometheusConfig{Host: srv.URL})
	resp, err := repo.Query(context.Background(), "test-token", "query=up", "query")

	assert.Nil(t, resp)
	require.Error(t, err)
	var unparsable *models.PrometheusUnparsableError
	assert.ErrorAs(t, err, &unparsable)
}

func TestPrometheusQuery_ConnectionRefused(t *testing.T) {
	repo := NewPrometheusRepository(PrometheusConfig{Host: "http://127.0.0.1:1"})
	resp, err := repo.Query(context.Background(), "test-token", "query=up", "query")

	assert.Nil(t, resp)
	require.Error(t, err)
	var unavailable *models.PrometheusUnavailableError
	assert.ErrorAs(t, err, &unavailable)
}

func TestPrometheusQuery_StatusError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"error","error":"bad PromQL expression"}`))
	}))
	defer srv.Close()

	repo := NewPrometheusRepository(PrometheusConfig{Host: srv.URL})
	resp, err := repo.Query(context.Background(), "test-token", "query=up", "query")

	assert.Nil(t, resp)
	require.Error(t, err)
	var queryErr *models.PrometheusQueryError
	assert.ErrorAs(t, err, &queryErr)
	assert.Equal(t, "bad PromQL expression", queryErr.Message)
}
