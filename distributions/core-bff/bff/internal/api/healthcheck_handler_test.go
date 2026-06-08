package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHealthcheckHandler_ReturnsStatus(t *testing.T) {
	app := newTestApp()

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, APIHealthCheckPath, nil)

	app.HealthcheckHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	assert.Equal(t, "available", body["status"])

	systemInfo, ok := body["systemInfo"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, Version, systemInfo["version"])
}

func TestHealthcheckHandler_ContentType(t *testing.T) {
	app := newTestApp()

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, APIHealthCheckPath, nil)

	app.HealthcheckHandler(rr, req, nil)

	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
}
