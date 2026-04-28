package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStatusHandler_Configured(t *testing.T) {
	app := &App{
		logger:           testLogger(),
		mlflowConfigured: true,
	}

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, StatusPath, nil)
	app.StatusHandler(rr, req, httprouter.Params{})

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp MLflowStatusResponse
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.True(t, resp.Configured)
}

func TestStatusHandler_NotConfigured(t *testing.T) {
	app := &App{
		logger:           testLogger(),
		mlflowConfigured: false,
	}

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, StatusPath, nil)
	app.StatusHandler(rr, req, httprouter.Params{})

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp MLflowStatusResponse
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.False(t, resp.Configured)
}
