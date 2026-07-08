package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func lifecycleApp() *App {
	return &App{
		config:       config.EnvConfig{AuthMethod: config.AuthMethodDisabled},
		logger:       slog.New(slog.NewTextHandler(io.Discard, nil)),
		repositories: testRepositoriesWithAgents(),
	}
}

func TestStopAgentHandler_Success(t *testing.T) {
	app := lifecycleApp()
	req := httptest.NewRequest(http.MethodPost, AgentStopPath, nil)
	rr := httptest.NewRecorder()

	app.StopAgentHandler(rr, req, httprouter.Params{
		{Key: "ns", Value: "agent-ops-demo"},
		{Key: "name", Value: "sample-support-agent"},
	})

	require.Equal(t, http.StatusOK, rr.Code)

	var envelope LifecycleActionEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	require.NotNil(t, envelope.Data)
	assert.True(t, envelope.Data.Success)
	assert.Equal(t, "stop", envelope.Data.Action)
	assert.Equal(t, "sample-support-agent", envelope.Data.Name)
}

func TestStopAgentHandler_NotFound(t *testing.T) {
	app := lifecycleApp()
	req := httptest.NewRequest(http.MethodPost, AgentStopPath, nil)
	rr := httptest.NewRecorder()

	app.StopAgentHandler(rr, req, httprouter.Params{
		{Key: "ns", Value: "other-ns"},
		{Key: "name", Value: "missing-agent"},
	})

	require.Equal(t, http.StatusNotFound, rr.Code)
}

func TestStopAgentHandler_InvalidParams(t *testing.T) {
	app := lifecycleApp()
	req := httptest.NewRequest(http.MethodPost, AgentStopPath, nil)
	rr := httptest.NewRecorder()

	app.StopAgentHandler(rr, req, httprouter.Params{
		{Key: "ns", Value: "INVALID_NS"},
		{Key: "name", Value: "sample-support-agent"},
	})

	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestStartAgentHandler_Success(t *testing.T) {
	app := lifecycleApp()

	// Stop first so start has something to do
	stopReq := httptest.NewRequest(http.MethodPost, AgentStopPath, nil)
	stopRR := httptest.NewRecorder()
	app.StopAgentHandler(stopRR, stopReq, httprouter.Params{
		{Key: "ns", Value: "agent-ops-demo"},
		{Key: "name", Value: "sample-support-agent"},
	})
	require.Equal(t, http.StatusOK, stopRR.Code)

	req := httptest.NewRequest(http.MethodPost, AgentStartPath, nil)
	rr := httptest.NewRecorder()

	app.StartAgentHandler(rr, req, httprouter.Params{
		{Key: "ns", Value: "agent-ops-demo"},
		{Key: "name", Value: "sample-support-agent"},
	})

	require.Equal(t, http.StatusOK, rr.Code)

	var envelope LifecycleActionEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	require.NotNil(t, envelope.Data)
	assert.True(t, envelope.Data.Success)
	assert.Equal(t, "start", envelope.Data.Action)
}

func TestStartAgentHandler_NotFound(t *testing.T) {
	app := lifecycleApp()
	req := httptest.NewRequest(http.MethodPost, AgentStartPath, nil)
	rr := httptest.NewRecorder()

	app.StartAgentHandler(rr, req, httprouter.Params{
		{Key: "ns", Value: "other-ns"},
		{Key: "name", Value: "missing-agent"},
	})

	require.Equal(t, http.StatusNotFound, rr.Code)
}

func TestStartAgentHandler_InvalidParams(t *testing.T) {
	app := lifecycleApp()
	req := httptest.NewRequest(http.MethodPost, AgentStartPath, nil)
	rr := httptest.NewRecorder()

	app.StartAgentHandler(rr, req, httprouter.Params{
		{Key: "ns", Value: "agent-ops-demo"},
		{Key: "name", Value: "INVALID_NAME"},
	})

	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestStopAgentHandler_Conflict(t *testing.T) {
	app := lifecycleApp()
	params := httprouter.Params{
		{Key: "ns", Value: "agent-ops-demo"},
		{Key: "name", Value: "sample-support-agent"},
	}

	// First stop succeeds
	req := httptest.NewRequest(http.MethodPost, AgentStopPath, nil)
	rr := httptest.NewRecorder()
	app.StopAgentHandler(rr, req, params)
	require.Equal(t, http.StatusOK, rr.Code)

	// Second stop returns 409
	req = httptest.NewRequest(http.MethodPost, AgentStopPath, nil)
	rr = httptest.NewRecorder()
	app.StopAgentHandler(rr, req, params)
	require.Equal(t, http.StatusConflict, rr.Code)
}

func TestStartAgentHandler_Conflict(t *testing.T) {
	app := lifecycleApp()
	params := httprouter.Params{
		{Key: "ns", Value: "agent-ops-demo"},
		{Key: "name", Value: "sample-support-agent"},
	}

	// Agent starts in running state — start should return 409
	req := httptest.NewRequest(http.MethodPost, AgentStartPath, nil)
	rr := httptest.NewRecorder()
	app.StartAgentHandler(rr, req, params)
	require.Equal(t, http.StatusConflict, rr.Code)
}
